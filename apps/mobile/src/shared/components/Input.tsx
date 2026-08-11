import React, { useState } from 'react';
import { View, TextInput, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { typography } from '../theme/typography';

interface InputProps {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  error?: string;
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
  multiline?: boolean;
  numberOfLines?: number;
  style?: ViewStyle;
  inputStyle?: TextStyle;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
}

export function Input({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  error,
  keyboardType = 'default',
  multiline = false,
  numberOfLines,
  style,
  inputStyle,
  autoCapitalize = 'none',
}: InputProps) {
  const theme = useTheme();
  const [isFocused, setIsFocused] = useState(false);

  const borderColor = error
    ? theme.colors.semantic.error
    : isFocused
    ? theme.colors.brand.primary
    : 'transparent';

  return (
    <View style={[styles.container, { marginBottom: theme.spacing.lg }, style]}>
      {label && (
        <Text
          style={[
            typography.caption,
            { color: isFocused ? theme.colors.brand.primary : theme.colors.text.secondary, marginBottom: 8 },
          ]}
        >
          {label}
        </Text>
      )}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.text.tertiary}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        multiline={multiline}
        numberOfLines={numberOfLines}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        style={[
          styles.input,
          {
            backgroundColor: theme.colors.surface.input,
            color: theme.colors.text.primary,
            borderRadius: theme.borderRadius.md,
            borderColor,
            borderWidth: 1.5,
            minHeight: multiline ? 100 : 48,
          },
          multiline && styles.multiline,
          inputStyle,
        ]}
      />
      {error && (
        <Text style={[typography.caption, { color: theme.colors.semantic.error, marginTop: 4 }]}>
          {error}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  input: {
    fontSize: 15,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  multiline: {
    textAlignVertical: 'top',
    paddingTop: 14,
  },
});
