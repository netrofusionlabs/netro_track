import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useTheme } from '../../shared/theme/ThemeProvider';
import { typography } from '../../shared/theme/typography';
import {
  Card,
  StatusBadge,
  EmptyState,
  ScreenHeader,
  AppIcon,
  LoadingState,
} from '../../shared/components';
import { useVisits } from './hooks/useVisits';
import { useEmployeeVisits } from '../employees/hooks/useEmployeeDetail';
import { useRefreshOnFocus } from '../../shared/utils/useRefreshOnFocus';
import type { VisitRecord } from './types';

function formatTime(iso: string | null): string {
  if (!iso) return '--:--';
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' });
}

function VisitCard({ visit }: { visit: VisitRecord }) {
  const theme = useTheme();
  const complete = !!visit.checkOutTime;

  return (
    <Card style={{ paddingVertical: 14, paddingHorizontal: 16 }}>
      <View style={styles.rowBetween}>
        <View style={{ flex: 1, paddingRight: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <AppIcon name="visits" color={theme.colors.brand.primary} size={18} />
            <Text style={[typography.headingSm, { color: theme.colors.text.primary }]}>
              {visit.customer?.name ?? 'Unknown Customer'}
            </Text>
          </View>
          <Text style={[typography.caption, { color: theme.colors.text.secondary, marginTop: 4 }]}>
            {formatDate(visit.checkInTime)} · {formatTime(visit.checkInTime)} → {formatTime(visit.checkOutTime)}
          </Text>
        </View>
        <StatusBadge
          status={complete ? 'completed' : 'active'}
          label={complete ? 'Complete' : 'Active'}
        />
      </View>

      {visit.productsDiscussed && (
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 6 }}>
          <AppIcon name="products" color={theme.colors.text.secondary} size={14} />
          <Text style={[typography.bodySm, { color: theme.colors.text.secondary }]} numberOfLines={2}>
            {visit.productsDiscussed}
          </Text>
        </View>
      )}

      {visit.notes && (
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 6 }}>
          <AppIcon name="document" color={theme.colors.text.tertiary} size={14} />
          <Text style={[typography.bodySm, { color: theme.colors.text.tertiary }]} numberOfLines={2}>
            {visit.notes}
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

export function VisitsScreen({ route, navigation }: Props = {}) {
  const theme = useTheme();
  const employeeId = route?.params?.employeeId;
  const employeeName = route?.params?.employeeName;

  const self = useVisits();
  const emp = useEmployeeVisits(employeeId ?? '');
  const { data: visits = [], isLoading, refetch } = employeeId ? emp : self;

  useRefreshOnFocus(refetch);

  const viewOnly = !!employeeId;

  const handleNew = () => {
    if (navigation) {
      navigation.navigate('NewVisit');
    }
  };

  return (
    <View style={[styles.safe, { backgroundColor: theme.colors.surface.background }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <ScreenHeader
          title={employeeId ? `${employeeName ?? 'Employee'}'s Visits` : 'Visits'}
          subtitle={`${visits.length} total records`}
          actionLabel={(!viewOnly && '+ New') || undefined}
          onAction={!viewOnly ? handleNew : undefined}
        />

        {isLoading && <LoadingState message="Loading visits..." />}

        {!isLoading && visits.length === 0 && (
          <EmptyState
            icon="visits"
            title="No Visits Recorded"
            subtitle="Log your first customer visit to keep your activity updated."
            actionLabel="Log Visit"
            onAction={handleNew}
          />
        )}

        {visits.map((v) => (
          <VisitCard key={v.id} visit={v} />
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
