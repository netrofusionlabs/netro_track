import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../shared/theme/ThemeProvider';
import {
  ScreenHeader,
  ListItem,
  EmptyState,
  Badge,
  SearchInput,
  Avatar,
  LoadingState,
} from '../../shared/components';
import { useCustomers } from './hooks/useCustomers';
import { useRefreshOnFocus } from '../../shared/utils/useRefreshOnFocus';

export function CustomerListScreen() {
  const navigation = useNavigation<any>();
  const theme = useTheme();
  const { data: customers = [], isLoading, refetch } = useCustomers();
  const [searchQuery, setSearchQuery] = useState('');

  useRefreshOnFocus(refetch);

  const filteredCustomers = customers.filter((c) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      c.name.toLowerCase().includes(q) ||
      c.phone?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.village?.toLowerCase().includes(q)
    );
  });

  return (
    <View style={[styles.safe, { backgroundColor: theme.colors.surface.background }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <ScreenHeader
          title="Customers"
          subtitle={`${customers.length} total clients`}
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

        <SearchInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search by name, phone, or location..."
        />

        {isLoading && <LoadingState message="Loading customer directory..." />}

        {!isLoading && filteredCustomers.length === 0 && (
          <EmptyState
            icon="customers"
            title={searchQuery ? 'No Customers Match' : 'No Customers'}
            subtitle={
              searchQuery
                ? `No clients found matching "${searchQuery}".`
                : 'Customers added by your company admin will appear here.'
            }
          />
        )}

        {filteredCustomers.map((c) => (
          <ListItem
            key={c.id}
            avatar={<Avatar name={c.name} size="md" />}
            title={c.name}
            subtitle={[c.phone, c.email, c.village].filter(Boolean).join(' · ') || 'No contact info'}
            trailing={
              c.type ? (
                <Badge label={c.type} variant="info" size="sm" />
              ) : undefined
            }
            showChevron
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 32 },
});
