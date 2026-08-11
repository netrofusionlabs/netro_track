import { Platform, PermissionsAndroid, Linking } from 'react-native';

export interface PermissionStatusResult {
  locationGranted: boolean;
  backgroundLocationGranted: boolean;
  notificationGranted: boolean;
  canRequestLocation: boolean;
  canRequestNotification: boolean;
}

/**
 * Checks current permission states on the device.
 */
export async function checkAllPermissions(): Promise<PermissionStatusResult> {
  if (Platform.OS === 'android') {
    try {
      const fine = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
      );
      const coarse = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION
      );
      const locationGranted = fine || coarse;

      let backgroundLocationGranted = true;
      if (Number(Platform.Version) >= 29) {
        backgroundLocationGranted = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION
        );
      }

      let notificationGranted = true;
      if (Number(Platform.Version) >= 33) {
        notificationGranted = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
        );
      }

      return {
        locationGranted,
        backgroundLocationGranted,
        notificationGranted,
        canRequestLocation: !locationGranted || !backgroundLocationGranted,
        canRequestNotification: !notificationGranted,
      };
    } catch (err) {
      console.warn('[permissionHandler] Error checking Android permissions:', err);
      return {
        locationGranted: false,
        backgroundLocationGranted: false,
        notificationGranted: false,
        canRequestLocation: true,
        canRequestNotification: true,
      };
    }
  }

  // iOS permissions handling (handled via standard OS prompts on demand)
  return {
    locationGranted: true,
    backgroundLocationGranted: true,
    notificationGranted: true,
    canRequestLocation: false,
    canRequestNotification: false,
  };
}

/**
 * Requests location permissions (Foreground + Background where applicable).
 */
export async function requestLocationPermissionsFlow(): Promise<boolean> {
  if (Platform.OS === 'android') {
    try {
      const granted = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
      ]);

      const fineGranted =
        granted[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION] ===
        PermissionsAndroid.RESULTS.GRANTED;
      const coarseGranted =
        granted[PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION] ===
        PermissionsAndroid.RESULTS.GRANTED;

      const locationGranted = fineGranted || coarseGranted;

      // Request background location if foreground granted on Android 10+
      if (locationGranted && Number(Platform.Version) >= 29) {
        try {
          await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION,
            {
              title: 'Background Location Permission',
              message:
                'NetroTrack requires background location access during your active shift to record attendance route and distance.',
              buttonPositive: 'Allow',
              buttonNegative: 'Cancel',
            }
          );
        } catch (bgErr) {
          console.warn('[permissionHandler] Background location request error:', bgErr);
        }
      }

      return locationGranted;
    } catch (err) {
      console.warn('[permissionHandler] Location request error:', err);
      return false;
    }
  }
  return true;
}

/**
 * Requests notification permission (Android 13+).
 */
export async function requestNotificationPermissionFlow(): Promise<boolean> {
  if (Platform.OS === 'android' && Number(Platform.Version) >= 33) {
    try {
      const res = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
        {
          title: 'Notification Permission Required',
          message:
            'NetroTrack requires notification permission to display active shift tracking updates and important attendance notifications.',
          buttonPositive: 'Allow',
          buttonNegative: 'Cancel',
        }
      );
      return res === PermissionsAndroid.RESULTS.GRANTED;
    } catch (err) {
      console.warn('[permissionHandler] Notification request error:', err);
      return false;
    }
  }
  return true;
}

/**
 * Opens device app settings page.
 */
export async function openAppSettings(): Promise<void> {
  try {
    await Linking.openSettings();
  } catch (err) {
    console.warn('[permissionHandler] Failed to open settings:', err);
  }
}
