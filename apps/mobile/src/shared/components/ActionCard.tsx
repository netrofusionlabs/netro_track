import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { typography } from '../theme/typography';
import { shadows } from '../theme/shadows';

interface ActionCardProps {
  label: string;
  icon: string;
  onPress: () => void;
}

export function ActionCard({ label, icon, onPress }: ActionCardProps) {
  const theme = useTheme();
  
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        s.actionCard,
        shadows.sm,
        { backgroundColor: theme.colors.surface.card, borderRadius: theme.borderRadius.lg },
      ]}
      activeOpacity={0.7}
    >
      <View style={[s.actionIconWrap, { backgroundColor: theme.colors.brand.primaryLight }]}>
        <Text style={{ fontSize: 22 }}>{icon}</Text>
      </View>
      <Text style={[typography.buttonSm, { color: theme.colors.text.primary, marginTop: 8 }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  actionCard: {
    width: '47%',
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  actionIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
