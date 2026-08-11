import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useTheme } from '../../shared/theme/ThemeProvider';
import { typography } from '../../shared/theme/typography';
import {
  Card,
  Badge,
  EmptyState,
  ScreenHeader,
  AppIcon,
  LoadingState,
} from '../../shared/components';
import { useInspections } from './hooks/useInspections';
import { useEmployeeInspections } from '../employees/hooks/useEmployeeDetail';
import type { InspectionRecord } from './types';

function InspectionCard({ item }: { item: InspectionRecord }) {
  const theme = useTheme();
  return (
    <Card style={{ paddingVertical: 14, paddingHorizontal: 16 }}>
      <View style={styles.rowBetween}>
        <View style={{ flex: 1, paddingRight: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <AppIcon name="inspect" color={theme.colors.brand.primary} size={18} />
            <Text style={[typography.headingSm, { color: theme.colors.text.primary }]}>
              {item.siteName}
            </Text>
          </View>
          <Text style={[typography.caption, { color: theme.colors.text.secondary, marginTop: 4 }]}>
            {new Date(item.createdAt).toLocaleDateString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
        {item.category && (
          <Badge label={item.category} variant="info" size="sm" />
        )}
      </View>
      <Text style={[typography.bodyMd, { color: theme.colors.text.primary, marginTop: 10 }]} numberOfLines={3}>
        {item.observation}
      </Text>
      {item.recommendation && (
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 6 }}>
          <AppIcon name="document" color={theme.colors.text.tertiary} size={14} />
          <Text style={[typography.bodySm, { color: theme.colors.text.tertiary }]} numberOfLines={2}>
            {item.recommendation}
          </Text>
        </View>
      )}
      {item.imageUrls?.length > 0 && (
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 6 }}>
          <AppIcon name="camera" color={theme.colors.brand.primary} size={14} />
          <Text style={[typography.caption, { color: theme.colors.brand.primary, fontWeight: '600' }]}>
            {item.imageUrls.length} photo{item.imageUrls.length !== 1 ? 's' : ''} attached
          </Text>
        </View>
      )}
    </Card>
  );
}

interface Props {
  route?: { params?: { employeeId?: string; employeeName?: string } };
  navigation?: any;
}

export function InspectionsScreen({ route, navigation }: Props = {}) {
  const theme = useTheme();
  const employeeId = route?.params?.employeeId;
  const employeeName = route?.params?.employeeName;

  const self = useInspections();
  const emp = useEmployeeInspections(employeeId ?? '');
  const { data: inspections = [], isLoading } = employeeId ? emp : self;

  const viewOnly = !!employeeId;

  const handleNew = () => {
    if (navigation) {
      navigation.navigate('NewInspection');
    }
  };

  return (
    <View style={[styles.safe, { backgroundColor: theme.colors.surface.background }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <ScreenHeader
          title={employeeId ? `${employeeName ?? 'Employee'}'s Inspections` : 'Inspections'}
          subtitle={`${inspections.length} total records`}
          actionLabel={(!viewOnly && '+ New') || undefined}
          onAction={!viewOnly ? handleNew : undefined}
        />

        {isLoading && <LoadingState message="Loading inspection records..." />}

        {!isLoading && inspections.length === 0 && (
          <EmptyState
            icon="inspect"
            title="No Inspections Yet"
            subtitle="Tap '+ New' to record your first site inspection."
            actionLabel="Record Inspection"
            onAction={handleNew}
          />
        )}

        {inspections.map((item) => (
          <InspectionCard key={item.id} item={item} />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 32 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
});
