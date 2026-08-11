import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { AppIcon } from './AppIcon';

interface SearchInputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  onClear?: () => void;
  style?: ViewStyle;
}

export function SearchInput({
  value,
  onChangeText,
  placeholder = 'Search...',
  onClear,
  style,
}: SearchInputProps) {
  const theme = useTheme();
  const [isFocused, setIsFocused] = useState(false);

  const handleClear = () => {
    onChangeText('');
    if (onClear) onClear();
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.surface.subtle,
          borderRadius: theme.borderRadius.md,
          borderColor: isFocused ? theme.colors.brand.primary : theme.colors.surface.border,
          borderWidth: isFocused ? 1.5 : 1,
        },
        style,
      ]}
    >
      <AppIcon
        name="search"
        color={isFocused ? theme.colors.brand.primary : theme.colors.text.tertiary}
        size={18}
      />

      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.text.tertiary}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        style={[
          styles.input,
          {
            color: theme.colors.text.primary,
          },
        ]}
      />

      {value.length > 0 && (
        <TouchableOpacity onPress={handleClear} activeOpacity={0.7} style={styles.clearBtn}>
          <AppIcon name="close" color={theme.colors.text.tertiary} size={16} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  input: {
    flex: 1,
    fontSize: 14,
    marginLeft: 8,
    paddingVertical: 0,
  },
  clearBtn: {
    padding: 4,
  },
});
