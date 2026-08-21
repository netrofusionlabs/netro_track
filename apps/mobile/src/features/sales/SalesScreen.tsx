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
import { useSales } from './hooks/useSales';
import { useEmployeeSales } from '../employees/hooks/useEmployeeDetail';
import { useRefreshOnFocus } from '../../shared/utils/useRefreshOnFocus';
import type { SaleRecord } from './types';

function SaleCard({ sale }: { sale: SaleRecord }) {
  const theme = useTheme();
  return (
    <Card style={{ paddingVertical: 14, paddingHorizontal: 16 }}>
      <View style={styles.rowBetween}>
        <View style={{ flex: 1, paddingRight: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <AppIcon name="sales" color={theme.colors.semantic.success} size={18} />
            <Text style={[typography.headingSm, { color: theme.colors.text.primary }]}>
              {sale.customer?.name ?? 'Unknown Customer'}
            </Text>
          </View>
          <Text style={[typography.caption, { color: theme.colors.text.secondary, marginTop: 4 }]}>
            {new Date(sale.createdAt).toLocaleDateString([], { day: 'numeric', month: 'short' })} · {sale.items.length} item{sale.items.length !== 1 ? 's' : ''}
          </Text>
        </View>
        <Badge
          label={`₹${Number(sale.totalAmount).toLocaleString('en-IN')}`}
          variant="success"
          size="md"
        />
      </View>
      {sale.remarks && (
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 6 }}>
          <AppIcon name="document" color={theme.colors.text.tertiary} size={14} />
          <Text style={[typography.bodySm, { color: theme.colors.text.tertiary }]} numberOfLines={2}>
            {sale.remarks}
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

export function SalesScreen({ route, navigation }: Props = {}) {
  const theme = useTheme();
  const employeeId = route?.params?.employeeId;
  const employeeName = route?.params?.employeeName;

  const self = useSales();
  const emp = useEmployeeSales(employeeId ?? '');
  const { data: sales = [], isLoading, refetch } = employeeId ? emp : self;

  useRefreshOnFocus(refetch);

  const viewOnly = !!employeeId;

  const handleNew = () => {
    if (navigation) {
      navigation.navigate('NewSale');
    }
  };

  return (
    <View style={[styles.safe, { backgroundColor: theme.colors.surface.background }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <ScreenHeader
          title={employeeId ? `${employeeName ?? 'Employee'}'s Sales` : 'Sales'}
          subtitle={`${sales.length} total transactions`}
          actionLabel={(!viewOnly && '+ Record') || undefined}
          onAction={!viewOnly ? handleNew : undefined}
          onBackPress={() => {
            if (navigation) {
              if (navigation.canGoBack()) {
                navigation.goBack();
              } else {
                const parent = navigation.getParent();
                if (parent && parent.canGoBack()) {
                  parent.goBack();
                } else {
                  navigation.navigate('Home');
                }
              }
            }
          }}
        />

        {isLoading && <LoadingState message="Loading sales records..." />}

        {!isLoading && sales.length === 0 && (
          <EmptyState
            icon="sales"
            title="No Sales Transactions"
            subtitle="Record your first product sale to track your revenue."
            actionLabel="Record Sale"
            onAction={handleNew}
          />
        )}

        {sales.map((sItem) => (
          <SaleCard key={sItem.id} sale={sItem} />
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
