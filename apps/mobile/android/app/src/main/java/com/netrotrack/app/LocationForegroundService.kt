package com.netrotrack.app

import android.annotation.SuppressLint
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.location.Location
import android.location.LocationListener
import android.location.LocationManager
import android.os.Build
import android.os.Bundle
import android.os.IBinder
import android.util.Log
import org.json.JSONArray
import org.json.JSONObject
import java.util.UUID

/**
 * LocationForegroundService — Native Android Service for GPS capture.
 *
 * WHY THIS EXISTS:
 *   Android kills the React Native JS thread when the app is swiped from recents.
 *   A LocationListener registered through LocationModule (a ReactContextBaseJavaModule)
 *   dies with the JS process. A proper Android Service with startForeground() is the
 *   ONLY construct Android protects from process death on swipe-from-recents.
 *
 * LIFECYCLE:
 *   Start: LocationModule.startLocationUpdates() → startService(intent)
 *   Stop:  LocationModule.stopLocationUpdates()  → stopService(intent)
 *
 * DATA FLOW:
 *   onLocationChanged() → appendToSharedPreferences() → SharedPreferences (on-disk)
 *   On app reopen → JS drainNativeBuffer() → reads SharedPreferences → MMKV → API
 *
 * SURVIVAL:
 *   ✅ App minimized        — service keeps running (foreground service)
 *   ✅ Swipe from recents   — service keeps running (foreground service)
 *   ✅ Doze Mode            — service has location wake-lock exemption
 *   ❌ Force stop (Settings)— nothing survives force-stop; this is by Android design
 */
class LocationForegroundService : Service() {

    private var locationManager: LocationManager? = null
    private var isListening = false

    private val prefs: SharedPreferences by lazy {
        applicationContext.getSharedPreferences("netrotrack_gps_buffer", Context.MODE_PRIVATE)
    }

    companion object {
        const val CHANNEL_ID = "netrotrack_location_channel"
        const val NOTIFICATION_ID = 1001
        const val BUFFER_KEY = "gps_native_buffer"
        const val MAX_NATIVE_BUFFER = 720  // 2 hours of 10s points as a guard rail
        private const val TAG = "NetroTrack:LocationSvc"

        // Action constants for intent commands
        const val ACTION_START = "ACTION_START_LOCATION"
        const val ACTION_STOP = "ACTION_STOP_LOCATION"
        const val ACTION_SET_BACKGROUND = "ACTION_SET_BACKGROUND"
        const val EXTRA_IS_BACKGROUND = "extra_is_background"
    }

    @Volatile private var isInBackground = false

    private val locationListener = object : LocationListener {
        override fun onLocationChanged(location: Location) {
            if (isInBackground) {
                appendToSharedPreferences(location)
                Log.d(TAG, "Background fix captured: ${location.latitude},${location.longitude}")
            }
        }

        @Deprecated("Deprecated in Java")
        @Suppress("DEPRECATION")
        override fun onStatusChanged(provider: String?, status: Int, extras: Bundle?) {}
        override fun onProviderEnabled(provider: String) {}
        override fun onProviderDisabled(provider: String) {}
    }

    // ─── Service Lifecycle ────────────────────────────────────────────────────

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_START -> {
                startForeground(NOTIFICATION_ID, buildNotification())
                startLocationUpdates()
                Log.i(TAG, "Foreground service started — GPS capture active")
            }
            ACTION_STOP -> {
                stopLocationUpdates()
                stopForeground(STOP_FOREGROUND_REMOVE)
                stopSelf()
                Log.i(TAG, "Foreground service stopped")
            }
            ACTION_SET_BACKGROUND -> {
                isInBackground = intent.getBooleanExtra(EXTRA_IS_BACKGROUND, false)
                Log.d(TAG, "Background mode set to: $isInBackground")
            }
        }
        // START_STICKY: if killed by system under memory pressure, restart automatically
        return START_STICKY
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onTaskRemoved(rootIntent: Intent?) {
        // Called when user swipes app from recents.
        // We intentionally do NOT stop here — the service keeps running.
        Log.i(TAG, "App removed from recents — GPS service continues running")
        super.onTaskRemoved(rootIntent)
    }

    override fun onDestroy() {
        stopLocationUpdates()
        super.onDestroy()
    }

    // ─── Location Updates ─────────────────────────────────────────────────────

    @SuppressLint("MissingPermission")
    private fun startLocationUpdates() {
        if (isListening) return
        try {
            locationManager = getSystemService(Context.LOCATION_SERVICE) as LocationManager

            if (locationManager?.isProviderEnabled(LocationManager.GPS_PROVIDER) == true) {
                locationManager?.requestLocationUpdates(
                    LocationManager.GPS_PROVIDER,
                    10_000L,  // 10 seconds — matches JS foreground interval
                    0f,
                    locationListener
                )
            }
            if (locationManager?.isProviderEnabled(LocationManager.NETWORK_PROVIDER) == true) {
                locationManager?.requestLocationUpdates(
                    LocationManager.NETWORK_PROVIDER,
                    10_000L,
                    0f,
                    locationListener
                )
            }
            isListening = true
            Log.i(TAG, "LocationManager updates registered (10s interval)")
        } catch (e: SecurityException) {
            Log.e(TAG, "Location permission denied: ${e.message}")
        }
    }

    private fun stopLocationUpdates() {
        if (!isListening) return
        try {
            locationManager?.removeUpdates(locationListener)
            isListening = false
            Log.i(TAG, "LocationManager updates removed")
        } catch (e: Exception) {
            Log.w(TAG, "Error removing location updates: ${e.message}")
        }
    }

    // ─── SharedPreferences Buffer ─────────────────────────────────────────────

    private fun appendToSharedPreferences(location: Location) {
        try {
            val raw = prefs.getString(BUFFER_KEY, "[]") ?: "[]"
            val arr = JSONArray(raw)

            val point = JSONObject().apply {
                put("localId", UUID.randomUUID().toString())
                put("latitude", location.latitude)
                put("longitude", location.longitude)
                put("recordedAt", java.time.Instant.now().toString())
            }

            arr.put(point)

            // Guard against unbounded growth (max 2 hours of 10s points)
            val trimmed = if (arr.length() > MAX_NATIVE_BUFFER) {
                val newArr = JSONArray()
                val start = arr.length() - MAX_NATIVE_BUFFER
                for (i in start until arr.length()) newArr.put(arr.get(i))
                newArr
            } else arr

            prefs.edit().putString(BUFFER_KEY, trimmed.toString()).apply()
        } catch (e: Exception) {
            Log.e(TAG, "Failed to append to buffer: ${e.message}")
        }
    }

    // ─── Notification ─────────────────────────────────────────────────────────

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "NetroTrack Location",
                NotificationManager.IMPORTANCE_DEFAULT  // DEFAULT = shows in shade silently (no sound popup)
            ).apply {
                description = "GPS tracking during your active shift"
                setShowBadge(false)
                enableVibration(false)    // no vibration
                setSound(null, null)      // no sound
            }
            val manager = getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(channel)
        }
    }

    private fun buildNotification(): Notification {
        val openAppIntent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_SINGLE_TOP
        }
        val pendingIntent = PendingIntent.getActivity(
            this, 0, openAppIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            Notification.Builder(this, CHANNEL_ID)
                .setContentTitle("Active Shift")
                .setContentText("NetroTrack is tracking your location")
                .setSmallIcon(android.R.drawable.ic_menu_mylocation)
                .setContentIntent(pendingIntent)
                .setOngoing(true)       // Cannot be swiped away by user
                .setCategory(Notification.CATEGORY_SERVICE)
                .build()
        } else {
            @Suppress("DEPRECATION")
            Notification.Builder(this)
                .setContentTitle("Active Shift")
                .setContentText("NetroTrack is tracking your location")
                .setSmallIcon(android.R.drawable.ic_menu_mylocation)
                .setContentIntent(pendingIntent)
                .setOngoing(true)
                .build()
        }
    }
}
