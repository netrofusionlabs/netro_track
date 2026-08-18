/**
 * Geocoding and Places Service for NetroTrack Mobile.
 *
 * Primary Provider: Google Maps Platform (Places Autocomplete, Place Details, Geocoding)
 * Fallback Provider: OpenStreetMap / Photon / Nominatim (kept intact for offline/fallback resilience)
 */
import { GOOGLE_MAPS_API_KEY } from '../config/googleMapsConfig';

export interface GeocodedAddress {
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  formattedAddress: string;
  latitude?: number;
  longitude?: number;
  source: 'google' | 'photon' | 'nominatim';
}

export interface AutocompleteSuggestion {
  id: string;
  title: string;
  subtitle: string;
  source: 'google' | 'photon' | 'nominatim';
  googlePlaceId?: string;
  structured?: GeocodedAddress;
}

export const geocodingService = {
  isGoogleConfigured(): boolean {
    return Boolean(GOOGLE_MAPS_API_KEY && GOOGLE_MAPS_API_KEY.trim().length > 5);
  },

  /**
   * Search for locations / places matching user input.
   * Priority: Google Places Autocomplete API -> Photon (OSM) -> Nominatim (OSM)
   */
  async search(query: string): Promise<AutocompleteSuggestion[]> {
    const cleanText = query.trim();
    if (!cleanText || cleanText.length < 2) return [];

    // 1. Primary: Google Places Autocomplete
    if (this.isGoogleConfigured()) {
      try {
        const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
          cleanText
        )}&key=${GOOGLE_MAPS_API_KEY}`;
        const res = await fetch(url);
        const data = await res.json();

        if (data.status === 'OK' && Array.isArray(data.predictions) && data.predictions.length > 0) {
          return data.predictions.map((p: any) => ({
            id: p.place_id,
            title: p.structured_formatting?.main_text || p.description.split(',')[0],
            subtitle:
              p.structured_formatting?.secondary_text ||
              p.description.split(',').slice(1).join(',').trim(),
            source: 'google' as const,
            googlePlaceId: p.place_id,
          }));
        }
      } catch (err) {
        console.warn('[geocodingService] Google Places Autocomplete failed, falling back to OSM:', err);
      }
    }

    // 2. Secondary Fallback: Photon Engine (OpenStreetMap fuzzy search)
    try {
      const photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(cleanText)}&limit=10`;
      const res = await fetch(photonUrl);
      const data = await res.json();

      if (data.features && Array.isArray(data.features) && data.features.length > 0) {
        return data.features.map((f: any) => {
          const props = f.properties || {};
          const [lon, lat] = f.geometry?.coordinates || [];

          const street = [props.housenumber, props.street || props.name].filter(Boolean).join(' ');
          const title = props.name || street || props.city || 'Location';
          const subtitle = [props.district, props.city, props.state, props.country]
            .filter(Boolean)
            .join(', ');

          return {
            id: `photon-${lat}-${lon}-${props.osm_id || Math.random()}`,
            title,
            subtitle,
            source: 'photon' as const,
            structured: {
              addressLine1: street || props.name || '',
              addressLine2: props.district || props.suburb || '',
              city: props.city || props.town || props.village || '',
              state: props.state || '',
              zipCode: props.postcode || '',
              country: props.country || 'India',
              formattedAddress: [title, subtitle].filter(Boolean).join(', '),
              latitude: lat,
              longitude: lon,
              source: 'photon' as const,
            },
          };
        });
      }
    } catch (err) {
      console.warn('[geocodingService] Photon fallback failed, trying Nominatim:', err);
    }

    // 3. Tertiary Fallback: Nominatim (OpenStreetMap)
    try {
      const nomUrl = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=8&q=${encodeURIComponent(
        cleanText
      )}`;
      const res = await fetch(nomUrl, {
        headers: { 'User-Agent': 'NetroTrack-Mobile/1.0', 'Accept-Language': 'en' },
      });
      const data = await res.json();

      if (Array.isArray(data) && data.length > 0) {
        return data.map((item: any) => {
          const addr = item.address || {};
          const title = item.name || addr.road || addr.suburb || item.display_name.split(',')[0];
          const subtitle = item.display_name.split(',').slice(1, 4).join(',').trim();

          return {
            id: `nom-${item.place_id}`,
            title,
            subtitle,
            source: 'nominatim' as const,
            structured: {
              addressLine1: [addr.house_number, addr.road || addr.building].filter(Boolean).join(' ') || item.name || '',
              addressLine2: [addr.suburb, addr.neighbourhood, addr.quarter].filter(Boolean).join(', '),
              city: addr.city || addr.town || addr.municipality || '',
              state: addr.state || '',
              zipCode: addr.postcode || '',
              country: addr.country || 'India',
              formattedAddress: item.display_name,
              latitude: item.lat ? parseFloat(item.lat) : undefined,
              longitude: item.lon ? parseFloat(item.lon) : undefined,
              source: 'nominatim' as const,
            },
          };
        });
      }
    } catch (err) {
      console.warn('[geocodingService] Nominatim fallback error:', err);
    }

    return [];
  },

  /**
   * Fetch full structured address from a Google Place ID.
   */
  async getGooglePlaceDetails(placeId: string): Promise<GeocodedAddress | null> {
    if (!this.isGoogleConfigured()) return null;

    try {
      const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,formatted_address,address_components,geometry&key=${GOOGLE_MAPS_API_KEY}`;
      const res = await fetch(url);
      const data = await res.json();

      if (data.status === 'OK' && data.result) {
        const result = data.result;
        const comps: Array<{ long_name: string; short_name: string; types: string[] }> =
          result.address_components || [];

        let streetNumber = '';
        let route = '';
        let sublocality2 = '';
        let sublocality1 = '';
        let locality = '';
        let administrativeAreaLevel1 = '';
        let postalCode = '';
        let country = '';

        for (const comp of comps) {
          const types = comp.types;
          if (types.includes('street_number')) streetNumber = comp.long_name;
          if (types.includes('route')) route = comp.long_name;
          if (types.includes('sublocality_level_2')) sublocality2 = comp.long_name;
          if (types.includes('sublocality_level_1') || types.includes('sublocality')) sublocality1 = comp.long_name;
          if (types.includes('locality')) locality = comp.long_name;
          if (types.includes('administrative_area_level_1')) administrativeAreaLevel1 = comp.long_name;
          if (types.includes('postal_code')) postalCode = comp.long_name;
          if (types.includes('country')) country = comp.long_name;
        }

        const line1 = [streetNumber, route].filter(Boolean).join(' ') || result.name || '';
        const line2 = [sublocality2, sublocality1].filter(Boolean).join(', ');

        return {
          addressLine1: line1,
          addressLine2: line2,
          city: locality || sublocality1 || '',
          state: administrativeAreaLevel1 || '',
          zipCode: postalCode || '',
          country: country || 'India',
          formattedAddress: result.formatted_address || '',
          latitude: result.geometry?.location?.lat,
          longitude: result.geometry?.location?.lng,
          source: 'google',
        };
      }
    } catch (err) {
      console.warn('[geocodingService] Google Place Details failed:', err);
    }
    return null;
  },

  /**
   * Reverse geocode coordinates to human-readable address.
   * Priority: Google Geocoding API -> Nominatim (OSM)
   */
  async reverseGeocode(latitude: number, longitude: number): Promise<GeocodedAddress | null> {
    // 1. Google Geocoding API
    if (this.isGoogleConfigured()) {
      try {
        const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_MAPS_API_KEY}`;
        const res = await fetch(url);
        const data = await res.json();

        if (data.status === 'OK' && Array.isArray(data.results) && data.results.length > 0) {
          const result = data.results[0];
          const comps = result.address_components || [];

          let streetNumber = '';
          let route = '';
          let sublocality = '';
          let locality = '';
          let state = '';
          let postalCode = '';
          let country = '';

          for (const comp of comps) {
            const types = comp.types;
            if (types.includes('street_number')) streetNumber = comp.long_name;
            if (types.includes('route')) route = comp.long_name;
            if (types.includes('sublocality')) sublocality = comp.long_name;
            if (types.includes('locality')) locality = comp.long_name;
            if (types.includes('administrative_area_level_1')) state = comp.long_name;
            if (types.includes('postal_code')) postalCode = comp.long_name;
            if (types.includes('country')) country = comp.long_name;
          }

          return {
            addressLine1: [streetNumber, route].filter(Boolean).join(' ') || sublocality || '',
            addressLine2: sublocality,
            city: locality || sublocality || '',
            state,
            zipCode: postalCode,
            country: country || 'India',
            formattedAddress: result.formatted_address,
            latitude,
            longitude,
            source: 'google',
          };
        }
      } catch (err) {
        console.warn('[geocodingService] Google reverseGeocode failed, falling back to OSM:', err);
      }
    }

    // 2. Nominatim Reverse Geocoding Fallback
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`;
      const res = await fetch(url, {
        headers: { 'User-Agent': 'NetroTrack-Mobile/1.0', 'Accept-Language': 'en' },
      });
      const data = await res.json();

      if (data && data.address) {
        const addr = data.address;
        return {
          addressLine1: [addr.house_number, addr.road].filter(Boolean).join(' ') || data.name || '',
          addressLine2: [addr.suburb, addr.neighbourhood].filter(Boolean).join(', '),
          city: addr.city || addr.town || addr.village || '',
          state: addr.state || '',
          zipCode: addr.postcode || '',
          country: addr.country || 'India',
          formattedAddress: data.display_name || '',
          latitude,
          longitude,
          source: 'nominatim',
        };
      }
    } catch (err) {
      console.warn('[geocodingService] Nominatim reverse geocode fallback error:', err);
    }

    return null;
  },
};
