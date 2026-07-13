import React from 'react';
import { View, TextInput, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

interface InputProps {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  error?: string;
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
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
  style,
  inputStyle,
  autoCapitalize = 'none'
}: InputProps) {
  const theme = useTheme();

  return (
    <View style={[styles.container, { marginBottom: theme.spacing.md }, style]}>
      {label && (
        <Text style={[styles.label, { color: theme.colors.text.secondary, marginBottom: theme.spacing.xs }]}>
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
        style={[
          styles.input,
          {
            backgroundColor: theme.colors.surface.input,
            color: theme.colors.text.primary,
            borderRadius: theme.borderRadius.sm,
            padding: theme.spacing.md,
            borderColor: error ? theme.colors.semantic.error : 'transparent',
            borderWidth: 1
          },
          inputStyle
        ]}
      />
      {error && (
        <Text style={[styles.error, { color: theme.colors.semantic.error, marginTop: theme.spacing.xxs }]}>
          {error}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%'
  },
  label: {
    fontSize: 14,
    fontWeight: '500'
  },
  input: {
    fontSize: 16
  },
  error: {
    fontSize: 12
  }
});
