import { Platform, PermissionsAndroid } from 'react-native';

/**
 * Requests all permissions needed for GPS tracking:
 *   - ACCESS_FINE_LOCATION + ACCESS_COARSE_LOCATION (all Android)
 *   - ACCESS_BACKGROUND_LOCATION (Android 10+ / API 29+)
 *   - POST_NOTIFICATIONS (Android 13+ / API 33+) — required for foreground service notification
 *
 * Returns true if location permission was granted.
 */
export async function requestLocationPermission(): Promise<boolean> {
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

      // Android 10+ (API 29+) — background location for tracking on home screen
      if ((fineGranted || coarseGranted) && Number(Platform.Version) >= 29) {
        try {
          await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION,
            {
              title: 'Background Location Permission',
              message:
                'NetroTrack needs location access in the background to track your active shift when minimized.',
              buttonPositive: 'Allow',
            }
          );
        } catch {
          // Non-fatal — tracking will still work in foreground
        }
      }

      // Android 13+ (API 33+) — POST_NOTIFICATIONS required for foreground service
      // notification to appear in the notification shade. Without this, the
      // "Active Shift" notification is silently suppressed by the OS.
      if (Number(Platform.Version) >= 33) {
        try {
          await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
            {
              title: 'Show Tracking Notification',
              message:
                'NetroTrack needs to show a notification while tracking your active shift.',
              buttonPositive: 'Allow',
            }
          );
        } catch {
          // Non-fatal — tracking still works, notification just won't appear
        }
      }

      return fineGranted || coarseGranted;
    } catch (err) {
      console.warn('[locationPermissions] Permission error:', err);
      return false;
    }
  }
  return true; // iOS handles permissions via Info.plist
}
