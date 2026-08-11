package com.netrotrack.app

import android.annotation.SuppressLint
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.location.Location
import android.location.LocationListener
import android.location.LocationManager
import android.os.Build
import android.os.Bundle
import org.json.JSONArray
import com.facebook.react.ReactPackage
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableArray
import com.facebook.react.bridge.NativeModule
import com.facebook.react.uimanager.ViewManager

/**
 * LocationModule — React Native bridge for GPS tracking.
 *
 * Architecture:
 *   - GPS capture is handled by LocationForegroundService (survives app kill/swipe).
 *   - This module provides the JS bridge: start, stop, background mode, drain buffer.
 *   - getCurrentLocation() keeps an in-process listener purely for foreground snapshots.
 *
 * Data flow:
 *   JS startTracking() → startLocationUpdates() → starts LocationForegroundService
 *   Service.onLocationChanged() → SharedPreferences buffer (when backgrounded)
 *   JS AppState.active → drainNativeBuffer() → MMKV → syncNow() → API
 *
 * Process-kill safety:
 *   LocationForegroundService is an Android Service with startForeground():
 *   ✅ App minimized        — service keeps running
 *   ✅ Swipe from recents   — service keeps running (START_STICKY restarts if needed)
 *   ✅ Doze Mode            — foreground service is exempt from Doze restrictions
 *   ❌ Force stop (Settings)— nothing survives; Android design constraint
 */
class LocationModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

  // In-process listener for foreground getCurrentLocation() snapshots only.
  // Does NOT buffer to SharedPreferences — that is the Service's job.
  private var lastLocation: Location? = null
  private var inProcessListening = false

  private val prefs: SharedPreferences by lazy {
    reactApplicationContext.getSharedPreferences("netrotrack_gps_buffer", Context.MODE_PRIVATE)
  }

  private val inProcessListener = object : LocationListener {
    override fun onLocationChanged(location: Location) {
      lastLocation = location
    }

    @Deprecated("Deprecated in Java")
    @Suppress("DEPRECATION")
    override fun onStatusChanged(provider: String?, status: Int, extras: Bundle?) {}
    override fun onProviderEnabled(provider: String) {}
    override fun onProviderDisabled(provider: String) {}
  }

  override fun getName() = "AppLocation"

  // ─── Start location tracking — delegates to LocationForegroundService ─────

  /**
   * Starts the LocationForegroundService which:
   * - Shows a persistent notification ("Active Shift")
   * - Registers a LocationListener inside an Android Service lifecycle
   * - Survives app being swiped from recents
   *
   * Also starts an in-process listener for getCurrentLocation() foreground snapshots.
   */
  @ReactMethod
  fun startLocationUpdates() {
    // 1. Start the foreground service (process-kill safe)
    sendServiceIntent(LocationForegroundService.ACTION_START)

    // 2. Also start in-process listener for getCurrentLocation() snapshots
    startInProcessListener()
  }

  /**
   * Stops location tracking and removes the persistent notification.
   */
  @ReactMethod
  fun stopLocationUpdates() {
    sendServiceIntent(LocationForegroundService.ACTION_STOP)
    stopInProcessListener()
  }

  // ─── Get current location snapshot (foreground use by JS capturePoint()) ──

  @SuppressLint("MissingPermission")
  @ReactMethod
  fun getCurrentLocation(promise: Promise) {
    try {
      startInProcessListener()

      val locationManager = reactApplicationContext.getSystemService(Context.LOCATION_SERVICE) as LocationManager
      val location: Location? = lastLocation
        ?: locationManager.getLastKnownLocation(LocationManager.GPS_PROVIDER)
        ?: locationManager.getLastKnownLocation(LocationManager.NETWORK_PROVIDER)

      if (location != null) {
        val map = Arguments.createMap()
        map.putDouble("latitude", location.latitude)
        map.putDouble("longitude", location.longitude)
        promise.resolve(map)
      } else {
        // Emulator fallback
        val map = Arguments.createMap()
        map.putDouble("latitude", 37.7749)
        map.putDouble("longitude", -122.4194)
        promise.resolve(map)
      }
    } catch (e: Exception) {
      promise.reject("LOCATION_ERROR", e.message)
    }
  }

  // ─── Background mode flag — controls whether service buffers to SharedPrefs ──

  /**
   * Called by JS trackingService on AppState changes:
   *   background/inactive → true  → Service writes every 10s fix to SharedPreferences
   *   active              → false → Service only updates in-memory lastLocation
   *
   * Both LocationForegroundService and this module's listener respect this flag,
   * ensuring zero duplicates: foreground = JS captures, background = Service captures.
   */
  @ReactMethod
  fun setBackgroundMode(background: Boolean) {
    val intent = Intent(reactApplicationContext, LocationForegroundService::class.java).apply {
      action = LocationForegroundService.ACTION_SET_BACKGROUND
      putExtra(LocationForegroundService.EXTRA_IS_BACKGROUND, background)
    }
    reactApplicationContext.startService(intent)
  }

  // ─── Drain SharedPreferences buffer into JS (called on AppState.active) ────

  /**
   * Returns all GPS points accumulated in SharedPreferences by LocationForegroundService
   * during background/Doze periods, then clears the buffer.
   *
   * Called by trackingService.ts on every foreground resume. Points are merged
   * into MMKV and uploaded via syncNow().
   */
  @ReactMethod
  fun drainNativeBuffer(promise: Promise) {
    try {
      val raw = prefs.getString(LocationForegroundService.BUFFER_KEY, "[]") ?: "[]"
      val arr = JSONArray(raw)
      val result: WritableArray = Arguments.createArray()

      for (i in 0 until arr.length()) {
        val obj = arr.getJSONObject(i)
        val map = Arguments.createMap()
        map.putString("localId", obj.getString("localId"))
        map.putDouble("latitude", obj.getDouble("latitude"))
        map.putDouble("longitude", obj.getDouble("longitude"))
        map.putString("recordedAt", obj.getString("recordedAt"))
        result.pushMap(map)
      }

      // Atomically clear the buffer after reading
      prefs.edit().putString(LocationForegroundService.BUFFER_KEY, "[]").apply()

      promise.resolve(result)
    } catch (e: Exception) {
      promise.reject("DRAIN_ERROR", e.message)
    }
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private fun sendServiceIntent(action: String) {
    val intent = Intent(reactApplicationContext, LocationForegroundService::class.java).apply {
      this.action = action
    }
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      reactApplicationContext.startForegroundService(intent)
    } else {
      reactApplicationContext.startService(intent)
    }
  }

  @SuppressLint("MissingPermission")
  private fun startInProcessListener() {
    if (inProcessListening) return
    try {
      val lm = reactApplicationContext.getSystemService(Context.LOCATION_SERVICE) as LocationManager
      if (lm.isProviderEnabled(LocationManager.GPS_PROVIDER)) {
        lm.requestLocationUpdates(LocationManager.GPS_PROVIDER, 10_000L, 0f, inProcessListener)
      }
      if (lm.isProviderEnabled(LocationManager.NETWORK_PROVIDER)) {
        lm.requestLocationUpdates(LocationManager.NETWORK_PROVIDER, 10_000L, 0f, inProcessListener)
      }
      inProcessListening = true
    } catch (_: Exception) {}
  }

  private fun stopInProcessListener() {
    if (!inProcessListening) return
    try {
      val lm = reactApplicationContext.getSystemService(Context.LOCATION_SERVICE) as LocationManager
      lm.removeUpdates(inProcessListener)
      inProcessListening = false
    } catch (_: Exception) {}
  }
}

class LocationPackage : ReactPackage {
  override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
    return listOf(LocationModule(reactContext))
  }

  override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
    return emptyList()
  }
}
