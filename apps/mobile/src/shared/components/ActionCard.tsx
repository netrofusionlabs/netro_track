import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { typography } from '../theme/typography';
import { AppIcon, AppIconName } from './AppIcon';

interface ActionCardProps {
  label: string;
  icon: AppIconName | string;
  onPress: () => void;
}

export function ActionCard({ label, icon, onPress }: ActionCardProps) {
  const theme = useTheme();
  
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        s.actionCard,
        {
          backgroundColor: theme.colors.surface.card,
          borderRadius: theme.borderRadius.lg,
          borderColor: theme.colors.surface.border,
        },
      ]}
      activeOpacity={0.7}
    >
      <View style={[s.actionIconWrap, { backgroundColor: theme.colors.brand.primaryLight }]}>
        <AppIcon name={icon} color={theme.colors.brand.primary} size={18} />
      </View>
      <Text style={[typography.buttonSm, { color: theme.colors.text.primary, marginTop: 8, fontSize: 12, fontWeight: '600' }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  actionCard: {
    width: '48%',
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  actionIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
