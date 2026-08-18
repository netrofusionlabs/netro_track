import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  TextInput,
  ActivityIndicator,
  StatusBar,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeProvider';
import { typography } from '../theme/typography';
import { AppIcon } from './AppIcon';
import { geocodingService } from '../services/geocodingService';

export interface StructuredAddress {
  formattedAddress: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  latitude?: number;
  longitude?: number;
}

interface AddressSearchModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (address: StructuredAddress) => void;
  initialQuery?: string;
}

interface SearchResultItem {
  id: string;
  title: string;
  subtitle: string;
  source: 'google' | 'photon' | 'nominatim';
  googlePlaceId?: string;
  structured?: StructuredAddress;
  raw?: any;
}

const POPULAR_CITIES = ['Bengaluru', 'Mumbai', 'Delhi NCR', 'Hyderabad', 'Chennai', 'Pune'];

function parseGooglePlaceDetails(details: any): StructuredAddress {
  const components = details.address_components || [];

  function getComponent(types: string[], useShort = false): string {
    const comp = components.find((c: any) => types.some((t) => c.types.includes(t)));
    return comp ? (useShort ? comp.short_name : comp.long_name) : '';
  }

  const premise = getComponent(['subpremise', 'premise', 'building', 'room']);
  const streetNumber = getComponent(['street_number']);
  const route = getComponent(['route']);
  const placeName = details.name || '';

  const line1Parts = [
    placeName,
    [premise, streetNumber, route].filter(Boolean).join(' '),
  ].filter(Boolean);

  const addressLine1 =
    line1Parts.length > 0
      ? line1Parts.join(', ')
      : details.formatted_address?.split(',')[0] || '';

  const line2Parts = [
    getComponent(['sublocality_level_2', 'sublocality_level_3']),
    getComponent(['sublocality_level_1', 'sublocality', 'neighborhood']),
  ].filter(Boolean);

  const addressLine2 = line2Parts.join(', ');

  const city =
    getComponent(['locality', 'postal_town', 'administrative_area_level_2']) ||
    getComponent(['sublocality_level_1']);
  const state = getComponent(['administrative_area_level_1']);
  const zipCode = getComponent(['postal_code']);
  const country = getComponent(['country']) || 'India';

  return {
    formattedAddress: details.formatted_address || '',
    addressLine1,
    addressLine2,
    city,
    state,
    zipCode,
    country,
    latitude: details.geometry?.location?.lat,
    longitude: details.geometry?.location?.lng,
  };
}

function parsePhotonFeature(f: any): SearchResultItem {
  const p = f.properties || {};
  const coords = f.geometry?.coordinates; // [lon, lat]

  const title =
    p.name || [p.housenumber, p.street].filter(Boolean).join(' ') || p.city || 'Location';

  const subtitleParts = [
    p.street && p.street !== title ? p.street : '',
    p.district || p.suburb || p.locality || '',
    p.city && p.city !== title ? p.city : '',
    p.state || '',
    p.postcode || '',
    p.country || '',
  ].filter(Boolean);

  const subtitle = subtitleParts.join(', ');

  const addressLine1 =
    [
      p.name && p.street && p.name !== p.street ? p.name : '',
      [p.housenumber, p.street].filter(Boolean).join(' ') || p.name || '',
    ]
      .filter(Boolean)
      .join(', ') || title;

  const addressLine2 = [
    p.district || p.suburb || p.locality || '',
    p.county && p.county !== p.city ? p.county : '',
  ]
    .filter(Boolean)
    .join(', ');

  const city = p.city || p.locality || p.district || '';
  const state = p.state || '';
  const zipCode = p.postcode || '';
  const country = p.country || 'India';

  return {
    id: `photon-${p.osm_id || Math.random()}-${p.name}`,
    title,
    subtitle,
    source: 'photon',
    structured: {
      formattedAddress: [title, subtitle].filter(Boolean).join(', '),
      addressLine1,
      addressLine2,
      city,
      state,
      zipCode,
      country,
      latitude: coords ? coords[1] : undefined,
      longitude: coords ? coords[0] : undefined,
    },
  };
}

function parseNominatimItem(item: any): SearchResultItem {
  const a = item.address || {};

  const line1Parts = [
    a.building || a.commercial || a.amenity || a.office || a.industrial || '',
    [a.house_number, a.road].filter(Boolean).join(' '),
  ].filter(Boolean);

  const addressLine1 =
    line1Parts.length > 0
      ? line1Parts.join(', ')
      : item.name || item.display_name.split(',')[0] || '';

  const line2Parts = [
    a.suburb || a.neighbourhood || a.quarter || a.residential || '',
    a.city_district || a.county || '',
  ].filter(Boolean);

  const addressLine2 = line2Parts.join(', ');
  const city = a.city || a.town || a.village || a.municipality || a.county || '';
  const state = a.state || a.province || '';
  const zipCode = a.postcode || '';
  const country = a.country || 'India';

  const parts = item.display_name.split(',');
  const title = item.name || parts[0] || 'Location';
  const subtitle = parts.slice(1).join(',').trim();

  return {
    id: `nom-${item.place_id || Math.random()}`,
    title,
    subtitle,
    source: 'nominatim',
    structured: {
      formattedAddress: item.display_name,
      addressLine1,
      addressLine2,
      city,
      state,
      zipCode,
      country,
      latitude: item.lat ? parseFloat(item.lat) : undefined,
      longitude: item.lon ? parseFloat(item.lon) : undefined,
    },
  };
}

export function AddressSearchModal({
  visible,
  onClose,
  onSelect,
  initialQuery = '',
}: AddressSearchModalProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchingDetails, setFetchingDetails] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isGoogleConfigured = geocodingService.isGoogleConfigured();

  const topPadding = Math.max(
    insets.top,
    Platform.OS === 'android' ? (StatusBar.currentHeight ?? 28) : 20
  ) + 8;

  useEffect(() => {
    if (visible) {
      setQuery(initialQuery);
      setResults([]);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 250);
    }
  }, [visible, initialQuery]);

  const searchAddress = async (searchText: string) => {
    const cleanText = searchText.trim();
    if (!cleanText || cleanText.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const suggestions = await geocodingService.search(cleanText);
      setResults(suggestions as SearchResultItem[]);
    } catch (err) {
      console.error('Failed to search address:', err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleQueryChange = (text: string) => {
    setQuery(text);
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    debounceTimer.current = setTimeout(() => {
      searchAddress(text);
    }, 300);
  };

  const handleSelectResult = async (item: SearchResultItem) => {
    if (item.source === 'google' && item.googlePlaceId && isGoogleConfigured) {
      setFetchingDetails(true);
      try {
        const structured = await geocodingService.getGooglePlaceDetails(item.googlePlaceId);
        if (structured) {
          onSelect(structured);
          onClose();
          return;
        }
      } catch (err) {
        console.error('Failed to fetch place details:', err);
      } finally {
        setFetchingDetails(false);
      }
    }

    if (item.structured) {
      onSelect(item.structured);
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      statusBarTranslucent={true}
      onRequestClose={onClose}
    >
      <View
        style={[
          styles.container,
          {
            backgroundColor: theme.colors.surface.background,
            paddingTop: topPadding,
          },
        ]}
      >
        <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent={true} />

        {/* Header Search Bar */}
        <View
          style={[
            styles.header,
            {
              backgroundColor: theme.colors.surface.card,
              borderBottomColor: theme.colors.surface.border,
            },
          ]}
        >
          <TouchableOpacity
            style={styles.backButton}
            onPress={onClose}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <AppIcon name="arrowLeft" size={22} color={theme.colors.text.primary} />
          </TouchableOpacity>

          <View
            style={[
              styles.inputContainer,
              {
                backgroundColor: theme.colors.surface.background,
                borderColor: theme.colors.surface.border,
              },
            ]}
          >
            <AppIcon name="search" size={18} color={theme.colors.text.tertiary} />
            <TextInput
              ref={inputRef}
              style={[styles.input, { color: theme.colors.text.primary }]}
              placeholder={
                isGoogleConfigured
                  ? 'Search Google Places, landmark, company...'
                  : 'Search landmark, building, city...'
              }
              placeholderTextColor={theme.colors.text.tertiary}
              value={query}
              onChangeText={handleQueryChange}
              autoCorrect={false}
              autoCapitalize="none"
              returnKeyType="search"
            />
            {query.length > 0 && (
              <TouchableOpacity
                onPress={() => {
                  setQuery('');
                  setResults([]);
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <AppIcon name="close" size={16} color={theme.colors.text.tertiary} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Popular City Suggestions when query is empty */}
        {query.length === 0 && (
          <View style={styles.quickSuggestionsContainer}>
            <Text
              style={[
                typography.caption,
                { color: theme.colors.text.secondary, marginBottom: 8, fontWeight: '600' },
              ]}
            >
              Popular Business Hubs
            </Text>
            <View style={styles.chipsRow}>
              {POPULAR_CITIES.map((city) => (
                <TouchableOpacity
                  key={city}
                  style={[
                    styles.cityChip,
                    {
                      backgroundColor: theme.colors.surface.card,
                      borderColor: theme.colors.surface.border,
                    },
                  ]}
                  onPress={() => {
                    setQuery(city);
                    searchAddress(city);
                  }}
                  activeOpacity={0.7}
                >
                  <AppIcon name="mapPin" size={12} color={theme.colors.brand.primary} />
                  <Text
                    style={[
                      typography.caption,
                      { color: theme.colors.text.primary, fontWeight: '600', marginLeft: 4 },
                    ]}
                  >
                    {city}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Loading Indicator */}
        {(loading || fetchingDetails) && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={theme.colors.brand.primary} />
            <Text
              style={[
                typography.caption,
                { color: theme.colors.text.secondary, marginTop: 8 },
              ]}
            >
              {fetchingDetails ? 'Fetching location details...' : 'Searching places...'}
            </Text>
          </View>
        )}

        {/* Empty State */}
        {!loading && !fetchingDetails && query.length >= 2 && results.length === 0 && (
          <View style={styles.emptyContainer}>
            <View
              style={[
                styles.emptyIconCircle,
                { backgroundColor: theme.colors.surface.card },
              ]}
            >
              <AppIcon name="mapPin" size={32} color={theme.colors.text.tertiary} />
            </View>
            <Text
              style={[
                typography.headingSm,
                { color: theme.colors.text.primary, marginTop: 12 },
              ]}
            >
              No Locations Found
            </Text>
            <Text
              style={[
                typography.bodySm,
                {
                  color: theme.colors.text.secondary,
                  textAlign: 'center',
                  marginTop: 4,
                  paddingHorizontal: 32,
                },
              ]}
            >
              Try entering a nearby landmark, company name, or city.
            </Text>
          </View>
        )}

        {/* Results List */}
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.resultItem,
                {
                  backgroundColor: theme.colors.surface.card,
                  borderColor: theme.colors.surface.border,
                },
              ]}
              onPress={() => handleSelectResult(item)}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.iconCircle,
                  { backgroundColor: theme.colors.brand.primaryLight },
                ]}
              >
                <AppIcon name="mapPin" size={18} color={theme.colors.brand.primary} />
              </View>
              <View style={styles.resultTextContainer}>
                <Text
                  numberOfLines={1}
                  style={[
                    typography.bodyMd,
                    { color: theme.colors.text.primary, fontWeight: '600' },
                  ]}
                >
                  {item.title}
                </Text>
                {item.subtitle ? (
                  <Text
                    numberOfLines={2}
                    style={[
                      typography.caption,
                      { color: theme.colors.text.secondary, marginTop: 2 },
                    ]}
                  >
                    {item.subtitle}
                  </Text>
                ) : null}
              </View>
            </TouchableOpacity>
          )}
        />

        {/* Footer info badge */}
        <View style={styles.footer}>
          <Text style={[typography.caption, { color: theme.colors.text.tertiary, fontSize: 11 }]}>
            {isGoogleConfigured
              ? 'Powered by Google Maps Platform & Places API'
              : 'Powered by Global Places & Maps Geocoding'}
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 12,
  },
  backButton: {
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
  },
  quickSuggestionsContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  cityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  loadingContainer: {
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    paddingVertical: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    padding: 16,
    gap: 8,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultTextContainer: {
    flex: 1,
  },
  footer: {
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
