import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeProvider';
import { typography } from '../theme/typography';
import { AppIcon } from './AppIcon';
import { BrandLogo } from './BrandLogo';
import { Avatar } from './Avatar';
import { useAuthStore } from '../../features/auth/stores/authStore';
import { api } from '../services/api';

interface GlobalHeaderProps {
  onSearchPress?: () => void;
  onNotificationPress?: () => void;
  onProfilePress?: () => void;
  notificationCount?: number;
  navigation?: any;
  subBrand?: string;
  style?: ViewStyle;
}

export function GlobalHeader({
  onSearchPress,
  onNotificationPress,
  onProfilePress,
  notificationCount,
  navigation,
  subBrand,
  style,
}: GlobalHeaderProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);

  // Auto-fetch company name & logo from backend
  useEffect(() => {
    if (user?.companyId) {
      api
        .get(`/companies/${user.companyId}`)
        .then((res) => {
          const comp = res.data?.data;
          if (comp && user && (user.companyName !== comp.name || user.companyLogoUrl !== comp.companyLogoUrl)) {
            useAuthStore.setState({
              user: {
                ...user,
                companyName: comp.name,
                companyLogoUrl: comp.companyLogoUrl,
              },
            });
          }
        })
        .catch(() => {
          // ignore
        });
    }
  }, [user?.companyId]);

  // Display logged user's company name or subBrand.
  const companyDisplayName = user?.companyName || subBrand;

  const nav = useNavigation<any>();

  const handleProfilePress = () => {
    if (onProfilePress) {
      onProfilePress();
    } else {
      const activeNav = navigation || nav;
      if (activeNav) {
        activeNav.navigate('Main', { screen: 'Profile' });
      }
    }
  };

  const handleSearchPress = () => {
    if (onSearchPress) {
      onSearchPress();
    }
  };

  const handleNotificationPress = () => {
    if (onNotificationPress) {
      onNotificationPress();
    }
  };

  const topInset = insets.top > 0 ? insets.top : 8;

  return (
    <View
      style={[
        styles.headerContainer,
        {
          backgroundColor: theme.colors.surface.card,
          borderBottomColor: theme.colors.surface.border,
          paddingTop: topInset + 4,
        },
        style,
      ]}
    >
      <View style={styles.headerInner}>
        {/* LEFT SIDE: NetroTrack Brand + Splitter + Client Company Name */}
        <View style={styles.leftSection}>
          <BrandLogo
            variant={companyDisplayName ? 'mark' : 'banner'}
            size={companyDisplayName ? 32 : 128}
            style={styles.brandLogo}
          />

          {/* Show Splitter & Client Company Name ONLY when companyDisplayName is available */}
          {!!companyDisplayName && (
            <>
              {/* CRISP VISIBLE VERTICAL SPLITTER */}
              <View style={[styles.verticalSplitter, { backgroundColor: theme.colors.surface.divider }]} />

              {/* Client Company Branding: Logo + Name */}
              <View style={styles.coBrandGroup}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, flexShrink: 1 }}>
                  {!!user?.companyLogoUrl && (
                    <Avatar source={user.companyLogoUrl} name={companyDisplayName} size="xs" />
                  )}
                  <Text style={styles.subBrandText} numberOfLines={1}>
                    {companyDisplayName}
                  </Text>
                </View>
              </View>
            </>
          )}
        </View>

        {/* RIGHT SIDE: Search, Notifications, User Avatar */}
        <View style={styles.rightSection}>
          {/* Search Action */}
          <TouchableOpacity
            onPress={handleSearchPress}
            activeOpacity={0.7}
            style={[styles.utilityBtn, { backgroundColor: theme.colors.surface.subtle }]}
            accessibilityRole="button"
            accessibilityLabel="Search"
          >
            <AppIcon name="search" color={theme.colors.text.secondary} size={16} />
          </TouchableOpacity>

          {/* Notification Bell Action */}
          <TouchableOpacity
            onPress={handleNotificationPress}
            activeOpacity={0.7}
            style={[styles.utilityBtn, { backgroundColor: theme.colors.surface.subtle }]}
            accessibilityRole="button"
            accessibilityLabel="Notifications"
          >
            <AppIcon name="bell" color={theme.colors.text.secondary} size={16} />
            {notificationCount != null && notificationCount > 0 && (
              <View style={[styles.notifBadge, { backgroundColor: theme.colors.semantic.error }]}>
                <Text style={styles.notifBadgeText}>
                  {notificationCount > 99 ? '99+' : notificationCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {/* User Profile Avatar */}
          <TouchableOpacity
            onPress={handleProfilePress}
            activeOpacity={0.8}
            style={styles.avatarTouchable}
            accessibilityRole="button"
            accessibilityLabel="User Profile"
          >
            <Avatar name={user?.name} size="sm" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    borderBottomWidth: 1,
    paddingBottom: 10,
    paddingHorizontal: 16,
    zIndex: 100,
  },
  headerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 40,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
    marginRight: 8,
  },
  brandLogo: {
    flexShrink: 1,
  },
  verticalSplitter: {
    width: 1.5,
    height: 26,
    marginHorizontal: 10,
    borderRadius: 1,
    opacity: 0.9,
  },
  coBrandGroup: {
    justifyContent: 'center',
    flexShrink: 1,
  },
  workspaceLabel: {
    fontSize: 8.5,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    lineHeight: 10,
  },
  subBrandText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0284C7',
    letterSpacing: -0.2,
    lineHeight: 15,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 8,
  },
  utilityBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  notifBadge: {
    position: 'absolute',
    top: -2,
    right: -3,
    minWidth: 15,
    height: 15,
    borderRadius: 7.5,
    paddingHorizontal: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
    lineHeight: 11,
  },
  avatarTouchable: {
    marginLeft: 2,
  },
});
