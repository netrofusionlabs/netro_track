import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '../../../shared/theme/ThemeProvider';
import { typography } from '../../../shared/theme/typography';
import { ScreenHeader, Card, AppIcon } from '../../../shared/components';
import { useNavigation } from '@react-navigation/native';

export function CompanySetupDashboardScreen() {
  const theme = useTheme();
  const navigation = useNavigation();

  const renderSetupItem = (icon: string, title: string, description: string) => (
    <Card variant="outlined" style={styles.setupCard}>
      <View style={[styles.iconContainer, { backgroundColor: theme.colors.brand.secondary }]}>
        <AppIcon name={icon as any} color={theme.colors.brand.primary} size={24} />
      </View>
      <View style={styles.textContainer}>
        <Text style={[typography.bodyMd, { color: theme.colors.text.primary, fontWeight: '600' }]}>{title}</Text>
        <Text style={[typography.caption, { color: theme.colors.text.secondary }]}>{description}</Text>
      </View>
      <AppIcon name="chevronRight" color={theme.colors.text.tertiary} size={20} />
    </Card>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface.background }]}>
      <ScreenHeader 
        title="Company Setup" 
        onBackPress={() => navigation.goBack()} 
      />
      
      <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent}>
        <Text style={[typography.headingMd, { color: theme.colors.text.primary, marginBottom: 8 }]}>
          Complete Organization Setup
        </Text>
        <Text style={[typography.bodyMd, { color: theme.colors.text.secondary, marginBottom: 24, textAlign: 'center' }]}>
          Configure the essential settings for the newly created tenant.
        </Text>

        {renderSetupItem('location', 'Locations', 'Configure company branches')}
        {renderSetupItem('business', 'Departments', 'Create departments')}
        {renderSetupItem('badge', 'Designations', 'Create designations')}
        {renderSetupItem('shieldCheck', 'Roles & Permissions', 'Configure access')}
        {renderSetupItem('people', 'Employees', 'Add employees')}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollArea: { flex: 1 },
  scrollContent: { padding: 16 },
  setupCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  textContainer: { flex: 1, marginRight: 12 }
});
