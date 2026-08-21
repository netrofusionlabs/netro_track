/**
 * Browser geolocation, with the same failure copy used by punch, visits and
 * inspections so a denied permission never reads as a generic API error.
 */
export function locate(): Promise<GeolocationCoordinates> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('This browser cannot report your location. Use the NetroTrack mobile app instead.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      position => resolve(position.coords),
      error => {
        switch (error.code) {
          case error.PERMISSION_DENIED:
            reject(new Error('Location permission was denied. Allow location for this site and try again.'));
            break;
          case error.POSITION_UNAVAILABLE:
            reject(new Error('Your location is unavailable right now. Check your device settings.'));
            break;
          case error.TIMEOUT:
            reject(new Error('Finding your location took too long. Try again.'));
            break;
          default:
            reject(new Error('Your location could not be read.'));
        }
      },
      { timeout: 10_000, maximumAge: 30_000, enableHighAccuracy: true },
    );
  });
}
