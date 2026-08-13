import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  FlatList,
  StyleSheet,
} from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { typography } from '../theme/typography';

export interface CountryCodeItem {
  code: string; // e.g. "+91"
  name: string; // e.g. "India"
  flag: string; // e.g. "🇮🇳"
}

export const COUNTRY_CODES: CountryCodeItem[] = [
  { code: '+91', name: 'India', flag: '🇮🇳' },
  { code: '+1', name: 'USA / Canada', flag: '🇺🇸' },
  { code: '+44', name: 'United Kingdom', flag: '🇬🇧' },
  { code: '+971', name: 'UAE', flag: '🇦🇪' },
  { code: '+65', name: 'Singapore', flag: '🇸🇬' },
  { code: '+61', name: 'Australia', flag: '🇦🇺' },
  { code: '+49', name: 'Germany', flag: '🇩🇪' },
  { code: '+966', name: 'Saudi Arabia', flag: '🇸🇦' },
  { code: '+968', name: 'Oman', flag: '🇴🇲' },
  { code: '+974', name: 'Qatar', flag: '🇶🇦' },
  { code: '+60', name: 'Malaysia', flag: '🇲🇾' },
];

export interface PhoneInputProps {
  value: string;
  onChangeText: (fullNumber: string) => void;
  placeholder?: string;
  defaultCountryCode?: string;
}

export function PhoneInput({
  value,
  onChangeText,
  placeholder = 'Enter 10-digit mobile number',
  defaultCountryCode = '+91',
}: PhoneInputProps) {
  const theme = useTheme();

  // Helper to extract country code and raw number from incoming value (e.g. "+91 9876543210")
  const parsePhoneValue = (val: string) => {
    if (!val) return { selectedCode: defaultCountryCode, rawNumber: '' };
    const matched = COUNTRY_CODES.find((c) => val.startsWith(c.code));
    if (matched) {
      const number = val.replace(matched.code, '').trim();
      return { selectedCode: matched.code, rawNumber: number };
    }
    return { selectedCode: defaultCountryCode, rawNumber: val.replace(/^\+\d+\s*/, '') };
  };

  const initial = parsePhoneValue(value);
  const [countryCode, setCountryCode] = useState<string>(initial.selectedCode);
  const [phoneNumber, setPhoneNumber] = useState<string>(initial.rawNumber);
  const [modalVisible, setModalVisible] = useState(false);

  const selectedCountry = COUNTRY_CODES.find((c) => c.code === countryCode) || COUNTRY_CODES[0];

  const handleCountrySelect = (item: CountryCodeItem) => {
    setCountryCode(item.code);
    setModalVisible(false);
    const combined = phoneNumber.trim() ? `${item.code} ${phoneNumber.trim()}` : '';
    onChangeText(combined);
  };

  const handleNumberChange = (num: string) => {
    // Only keep digits and spaces
    const cleaned = num.replace(/[^\d]/g, '');
    setPhoneNumber(cleaned);
    const combined = cleaned ? `${countryCode} ${cleaned}` : '';
    onChangeText(combined);
  };

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.inputWrapper,
          {
            backgroundColor: theme.colors.surface.card,
            borderColor: theme.colors.surface.border,
          },
        ]}
      >
        {/* Country Code Button */}
        <TouchableOpacity
          style={[styles.countryButton, { borderRightColor: theme.colors.surface.divider }]}
          onPress={() => setModalVisible(true)}
          activeOpacity={0.7}
        >
          <Text style={{ fontSize: 16, marginRight: 4 }}>{selectedCountry.flag}</Text>
          <Text style={[typography.bodySm, { color: theme.colors.text.primary, fontWeight: '700' }]}>
            {selectedCountry.code}
          </Text>
          <Text style={[typography.caption, { color: theme.colors.text.tertiary, marginLeft: 3 }]}>
            ▼
          </Text>
        </TouchableOpacity>

        {/* Text Input for Phone Number */}
        <TextInput
          style={[styles.textInput, { color: theme.colors.text.primary }]}
          value={phoneNumber}
          onChangeText={handleNumberChange}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.text.tertiary}
          keyboardType="phone-pad"
          maxLength={12}
        />
      </View>

      {/* Country Code Selection Modal */}
      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setModalVisible(false)}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surface.card }]}>
            <Text style={[typography.headingSm, { color: theme.colors.text.primary, marginBottom: 12 }]}>
              Select Country Code
            </Text>
            <FlatList
              data={COUNTRY_CODES}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => {
                const isSelected = item.code === countryCode;
                return (
                  <TouchableOpacity
                    style={[
                      styles.countryItem,
                      isSelected && { backgroundColor: theme.colors.brand.primaryLight },
                    ]}
                    onPress={() => handleCountrySelect(item)}
                  >
                    <Text style={{ fontSize: 20, marginRight: 12 }}>{item.flag}</Text>
                    <Text style={[typography.bodySm, { color: theme.colors.text.primary, flex: 1, fontWeight: '600' }]}>
                      {item.name}
                    </Text>
                    <Text style={[typography.bodySm, { color: theme.colors.brand.primary, fontWeight: '700' }]}>
                      {item.code}
                    </Text>
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    height: 48,
    overflow: 'hidden',
  },
  countryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: '100%',
    borderRightWidth: 1,
  },
  textInput: {
    flex: 1,
    paddingHorizontal: 12,
    fontSize: 15,
    height: '100%',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '90%',
    maxHeight: 380,
    borderRadius: 14,
    padding: 16,
    elevation: 5,
  },
  countryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
});
