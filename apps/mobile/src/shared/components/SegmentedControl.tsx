import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

export interface SegmentOption<T extends string = string> {
  value: T;
  label: string;
}

interface SegmentedControlProps<T extends string = string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  style?: ViewStyle;
}

export function SegmentedControl<T extends string = string>({
  options,
  value,
  onChange,
  style,
}: SegmentedControlProps<T>) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.surface.subtle,
          borderRadius: theme.borderRadius.md,
        },
        style,
      ]}
    >
      {options.map((opt) => {
        const isActive = opt.value === value;
        return (
          <TouchableOpacity
            key={opt.value}
            onPress={() => onChange(opt.value)}
            activeOpacity={0.8}
            style={[
              styles.segment,
              {
                borderRadius: theme.borderRadius.sm,
                backgroundColor: isActive ? theme.colors.brand.primary : 'transparent',
              },
            ]}
          >
            <Text
              style={[
                styles.segmentText,
                {
                  color: isActive ? theme.colors.text.inverse : theme.colors.text.secondary,
                  fontWeight: isActive ? '700' : '500',
                },
              ]}
            >
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 3,
    alignSelf: 'flex-start',
  },
  segment: {
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  segmentText: {
    fontSize: 12,
  },
});
