import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, FlatList } from 'react-native';
import { useTheme } from '../../../shared/theme/ThemeProvider';
import { typography } from '../../../shared/theme/typography';
import { Card, Input, Select, PhoneInput, AppIcon } from '../../../shared/components';
import { Control, Controller, FieldErrors } from 'react-hook-form';

export const COMPANY_TYPES = [
  { label: 'Private Limited Company', value: 'Private Limited Company' },
  { label: 'Public Limited Company', value: 'Public Limited Company' },
  { label: 'Limited Liability Partnership (LLP)', value: 'Limited Liability Partnership (LLP)' },
  { label: 'Partnership Firm', value: 'Partnership Firm' },
  { label: 'Sole Proprietorship', value: 'Sole Proprietorship' },
  { label: 'One Person Company (OPC)', value: 'One Person Company (OPC)' },
  { label: 'Section 8 Company / NGO', value: 'Section 8 Company / NGO' },
  { label: 'Other', value: 'Other' },
];

export const INDUSTRIES = [
  { label: 'Information Technology', value: 'Information Technology' },
  { label: 'Manufacturing', value: 'Manufacturing' },
  { label: 'Healthcare & Pharmaceuticals', value: 'Healthcare & Pharmaceuticals' },
  { label: 'Retail & E-Commerce', value: 'Retail & E-Commerce' },
  { label: 'Education & Training', value: 'Education & Training' },
  { label: 'Financial Services', value: 'Financial Services' },
  { label: 'Real Estate & Construction', value: 'Real Estate & Construction' },
  { label: 'Logistics & Transportation', value: 'Logistics & Transportation' },
  { label: 'Other', value: 'Other' },
];

export const EMP_COUNTS = [
  { label: '1 - 10 Employees', value: '1-10' },
  { label: '11 - 50 Employees', value: '11-50' },
  { label: '51 - 200 Employees', value: '51-200' },
  { label: '201 - 500 Employees', value: '201-500' },
  { label: '500+ Employees', value: '500+' },
];

export const COUNTRIES = [
  { label: 'India', value: 'India' },
  { label: 'United Arab Emirates', value: 'United Arab Emirates' },
  { label: 'United States', value: 'United States' },
  { label: 'United Kingdom', value: 'United Kingdom' },
  { label: 'Singapore', value: 'Singapore' },
  { label: 'Australia', value: 'Australia' },
];

export const TIMEZONES = [
  { label: 'Asia/Kolkata (IST)', value: 'Asia/Kolkata' },
  { label: 'Asia/Dubai (GST)', value: 'Asia/Dubai' },
  { label: 'Europe/London (GMT)', value: 'Europe/London' },
  { label: 'America/New_York (EST)', value: 'America/New_York' },
];

export const CURRENCIES = [
  { label: 'Indian Rupee (INR)', value: 'INR' },
  { label: 'US Dollar (USD)', value: 'USD' },
  { label: 'UAE Dirham (AED)', value: 'AED' },
  { label: 'British Pound (GBP)', value: 'GBP' },
  { label: 'Euro (EUR)', value: 'EUR' },
];

interface Props {
  control: any;
  errors: any;
  step?: 1 | 2; // Pass 1 for Profile, 2 for Contact, undefined for all
  prefix?: string; // e.g., 'company.' if nested in a wizard
}

export function CompanyFormFields({ control, errors, step, prefix = '' }: Props) {
  const theme = useTheme();

  const [pickerConfig, setPickerConfig] = useState<{
    visible: boolean;
    title: string;
    options: { label: string; value: string }[];
    selectedValue: string;
    onSelect: (val: string) => void;
  }>({
    visible: false,
    title: '',
    options: [],
    selectedValue: '',
    onSelect: () => {},
  });

  const openPicker = (title: string, options: any[], selectedValue: string, onSelect: (val: string) => void) => {
    setPickerConfig({ visible: true, title, options, selectedValue, onSelect });
  };

  const getError = (fieldName: string) => {
    if (prefix) {
      const parentError = errors[prefix.replace('.', '')];
      return (parentError as any)?.[fieldName]?.message;
    }
    return (errors as any)[fieldName]?.message;
  };

  const renderProfile = () => (
    <Card variant="outlined" style={StyleSheet.flatten([styles.cardContent, { marginBottom: 16 }])}>
      <Text style={[typography.headingMd, { color: theme.colors.text.primary, marginBottom: 16 }]}>Company Profile</Text>
      
      <Controller
        control={control}
        name={`${prefix}name`}
        render={({ field: { onChange, value } }) => (
          <Input label="Company Name *" value={value} onChangeText={onChange} error={getError('name')} />
        )}
      />

      <Controller
        control={control}
        name={`${prefix}code`}
        render={({ field: { onChange, value } }) => (
          <Input label="Company Code * (Unique)" value={value} onChangeText={(t: string) => onChange(t.toUpperCase())} error={getError('code')} />
        )}
      />

      <Controller
        control={control}
        name={`${prefix}legalName`}
        render={({ field: { onChange, value } }) => (
          <Input label="Legal / Registered Name" value={value} onChangeText={onChange} error={getError('legalName')} />
        )}
      />

      <Controller
        control={control}
        name={`${prefix}companyType`}
        render={({ field: { onChange, value } }) => (
          <Select 
            label="Company Type" 
            value={COMPANY_TYPES.find(o => o.value === value)?.label} 
            onPress={() => openPicker('Select Company Type', COMPANY_TYPES, value, onChange)} 
            placeholder="Select company type..."
            error={getError('companyType')}
          />
        )}
      />

      <Controller
        control={control}
        name={`${prefix}industry`}
        render={({ field: { onChange, value } }) => (
          <Select 
            label="Industry" 
            value={INDUSTRIES.find(o => o.value === value)?.label} 
            onPress={() => openPicker('Select Industry', INDUSTRIES, value, onChange)} 
            placeholder="Select industry..."
            error={getError('industry')}
          />
        )}
      />

      <Controller
        control={control}
        name={`${prefix}employeeCount`}
        render={({ field: { onChange, value } }) => (
          <Select 
            label="Employee Size" 
            value={EMP_COUNTS.find(o => o.value === value)?.label} 
            onPress={() => openPicker('Select Employee Size', EMP_COUNTS, value, onChange)} 
            placeholder="Select size..."
            error={getError('employeeCount')}
          />
        )}
      />
    </Card>
  );

  const renderContact = () => (
    <>
      <Card variant="outlined" style={StyleSheet.flatten([styles.cardContent, { marginBottom: 16 }])}>
        <Text style={[typography.headingMd, { color: theme.colors.text.primary, marginBottom: 16 }]}>Contact & Location</Text>
        
        <Text style={[typography.label, { color: theme.colors.text.secondary, marginBottom: 6 }]}>Phone Number</Text>
        <Controller
          control={control}
          name={`${prefix}phone`}
          render={({ field: { onChange, value } }) => (
            <View style={{ marginBottom: 12 }}>
              <PhoneInput value={value} onChangeText={onChange} defaultCountryCode="+91" />
              {getError('phone') && <Text style={styles.errorText}>{getError('phone')}</Text>}
            </View>
          )}
        />
        
        <Controller control={control} name={`${prefix}officialEmail`} render={({ field: { onChange, value } }) => (
          <Input label="Official Email" value={value} onChangeText={onChange} keyboardType="email-address" error={getError('officialEmail')} />
        )}/>
        <Controller control={control} name={`${prefix}addressLine1`} render={({ field: { onChange, value } }) => (
          <Input label="Address Line 1" value={value} onChangeText={onChange} error={getError('addressLine1')} />
        )}/>
        <Controller control={control} name={`${prefix}addressLine2`} render={({ field: { onChange, value } }) => (
          <Input label="Address Line 2" value={value} onChangeText={onChange} error={getError('addressLine2')} />
        )}/>
        
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Controller control={control} name={`${prefix}city`} render={({ field: { onChange, value } }) => (
            <Input label="City" value={value} onChangeText={onChange} style={{ flex: 1 }} error={getError('city')} />
          )}/>
          <Controller control={control} name={`${prefix}state`} render={({ field: { onChange, value } }) => (
            <Input label="State" value={value} onChangeText={onChange} style={{ flex: 1 }} error={getError('state')} />
          )}/>
        </View>
        
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Controller control={control} name={`${prefix}zipCode`} render={({ field: { onChange, value } }) => (
            <Input label="Zip Code / PIN" value={value} onChangeText={onChange} keyboardType="numeric" style={{ flex: 1 }} error={getError('zipCode')} />
          )}/>
          <View style={{ flex: 1 }}>
            <Controller control={control} name={`${prefix}country`} render={({ field: { onChange, value } }) => (
              <Select 
                label="Country" 
                value={COUNTRIES.find(o => o.value === value)?.label} 
                onPress={() => openPicker('Select Country', COUNTRIES, value, onChange)} 
                error={getError('country')}
              />
            )}/>
          </View>
        </View>
      </Card>

      <Card variant="outlined" style={styles.cardContent}>
        <Text style={[typography.headingMd, { color: theme.colors.text.primary, marginBottom: 16 }]}>Localization & Tax</Text>
        <Controller control={control} name={`${prefix}timezone`} render={({ field: { onChange, value } }) => (
          <Select 
            label="Timezone" 
            value={TIMEZONES.find(o => o.value === value)?.label} 
            onPress={() => openPicker('Select Timezone', TIMEZONES, value, onChange)} 
            error={getError('timezone')}
          />
        )}/>
        <Controller control={control} name={`${prefix}currency`} render={({ field: { onChange, value } }) => (
          <Select 
            label="Base Currency" 
            value={CURRENCIES.find(o => o.value === value)?.label} 
            onPress={() => openPicker('Select Currency', CURRENCIES, value, onChange)} 
            error={getError('currency')}
          />
        )}/>
        <Controller control={control} name={`${prefix}taxId`} render={({ field: { onChange, value } }) => (
          <Input label="Tax ID / GSTIN" value={value} onChangeText={onChange} autoCapitalize="characters" error={getError('taxId')} />
        )}/>
        <Controller control={control} name={`${prefix}registrationNumber`} render={({ field: { onChange, value } }) => (
          <Input label="Registration Number / CIN" value={value} onChangeText={onChange} autoCapitalize="characters" error={getError('registrationNumber')} />
        )}/>
      </Card>
    </>
  );

  return (
    <>
      {(!step || step === 1) && renderProfile()}
      {(!step || step === 2) && renderContact()}
      
      <Modal visible={pickerConfig.visible} transparent animationType="fade" onRequestClose={() => setPickerConfig({ ...pickerConfig, visible: false })}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setPickerConfig({ ...pickerConfig, visible: false })}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surface.card }]}>
            <Text style={[typography.headingSm, { color: theme.colors.text.primary, marginBottom: 16 }]}>
              {pickerConfig.title}
            </Text>
            <FlatList
              data={pickerConfig.options}
              keyExtractor={(item) => item.value}
              style={{ maxHeight: 400 }}
              renderItem={({ item }) => {
                const isSelected = item.value === pickerConfig.selectedValue;
                return (
                  <TouchableOpacity
                    style={[styles.pickerItem, isSelected && { backgroundColor: theme.colors.brand.primaryLight }]}
                    onPress={() => {
                      pickerConfig.onSelect(item.value);
                      setPickerConfig({ ...pickerConfig, visible: false });
                    }}
                  >
                    <Text style={[typography.bodyMd, { color: isSelected ? theme.colors.brand.primary : theme.colors.text.primary, fontWeight: isSelected ? '600' : '400' }]}>
                      {item.label}
                    </Text>
                    {isSelected && <AppIcon name="check" color={theme.colors.brand.primary} size={18} />}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  cardContent: { padding: 16 },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    borderRadius: 14,
    padding: 20,
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 4,
  }
});
