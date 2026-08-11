import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeProvider';
import { AppIcon } from './AppIcon';
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

  // Auto-fetch company name from backend if missing in persisted user profile
  useEffect(() => {
    if (user?.companyId && !user?.companyName) {
      api
        .get(`/company/${user.companyId}`)
        .then((res) => {
          const compName = res.data?.data?.name;
          if (compName && user) {
            useAuthStore.setState({
              user: { ...user, companyName: compName },
            });
          }
        })
        .catch(() => {
          // ignore
        });
    }
  }, [user?.companyId, user?.companyName]);

  // Display logged user's company name or subBrand. No hardcoded fallback string.
  const companyDisplayName = user?.companyName || subBrand;

  const handleProfilePress = () => {
    if (onProfilePress) {
      onProfilePress();
    } else if (navigation) {
      navigation.navigate('Profile');
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
        {/* LEFT SIDE: NetroTrack Brand + Optional Splitter & Co-branding */}
        <View style={styles.leftSection}>
          {/* NetroTrack Logo Badge */}
          <View style={[styles.brandMark, { backgroundColor: theme.colors.brand.primary }]}>
            <Text style={styles.brandMarkLetter}>N</Text>
          </View>

          {/* NetroTrack Brand Text */}
          <Text style={[styles.brandTitle, { color: theme.colors.text.primary }]}>
            NetroTrack
          </Text>

          {/* Show Splitter & Powered-by ONLY when companyDisplayName is available */}
          {!!companyDisplayName && (
            <>
              {/* CRISP VISIBLE VERTICAL SPLITTER */}
              <View style={[styles.verticalSplitter, { backgroundColor: theme.colors.surface.divider }]} />

              {/* Powered by Logged User Company Branding */}
              <View style={styles.coBrandGroup}>
                <Text style={[styles.poweredByText, { color: theme.colors.text.tertiary }]}>
                  powered by
                </Text>
                <Text style={styles.subBrandText} numberOfLines={1}>
                  {companyDisplayName}
                </Text>
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
    height: 40,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
  },
  brandMark: {
    width: 26,
    height: 26,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  brandMarkLetter: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginTop: -1,
  },
  brandTitle: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  verticalSplitter: {
    width: 1.5,
    height: 22,
    marginHorizontal: 10,
    borderRadius: 1,
    opacity: 0.9,
  },
  coBrandGroup: {
    justifyContent: 'center',
    flexShrink: 1,
  },
  poweredByText: {
    fontSize: 8,
    fontWeight: '500',
    lineHeight: 10,
    textTransform: 'lowercase',
  },
  subBrandText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0284C7',
    letterSpacing: -0.2,
    lineHeight: 13,
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
