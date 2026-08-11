import React, { useState } from 'react';
import { View, TextInput, Text, TouchableOpacity, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { typography } from '../theme/typography';
import { AppIcon, AppIconName } from './AppIcon';

interface InputProps {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  isPassword?: boolean;
  error?: string;
  leftIcon?: AppIconName | string;
  rightIcon?: AppIconName | string;
  onRightIconPress?: () => void;
  disabled?: boolean;
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
  secureTextEntry = false,
  isPassword,
  error,
  leftIcon,
  rightIcon,
  onRightIconPress,
  disabled = false,
  keyboardType = 'default',
  multiline = false,
  numberOfLines,
  style,
  inputStyle,
  autoCapitalize = 'none',
}: InputProps) {
  const theme = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Determine whether password toggle mode is active
  const isPasswordField = isPassword ?? secureTextEntry;
  const isSecure = isPasswordField ? !showPassword : false;

  const borderColor = error
    ? theme.colors.semantic.error
    : isFocused
    ? theme.colors.brand.primary
    : theme.colors.surface.border;

  return (
    <View style={[styles.container, { marginBottom: theme.spacing.md }, style]}>
      {label && (
        <Text
          style={[
            typography.label,
            {
              color: error
                ? theme.colors.semantic.error
                : isFocused
                ? theme.colors.brand.primary
                : theme.colors.text.secondary,
              marginBottom: 6,
            },
          ]}
        >
          {label}
        </Text>
      )}
      <View
        style={[
          styles.inputWrapper,
          {
            backgroundColor: disabled ? theme.colors.surface.disabled : theme.colors.surface.card,
            borderRadius: theme.borderRadius.md,
            borderColor,
            borderWidth: isFocused || error ? 1.5 : 1,
            minHeight: multiline ? 90 : 44,
          },
        ]}
      >
        {leftIcon && (
          <View style={styles.leftIconContainer}>
            <AppIcon
              name={leftIcon}
              color={isFocused ? theme.colors.brand.primary : theme.colors.text.tertiary}
              size={18}
            />
          </View>
        )}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.text.tertiary}
          secureTextEntry={isSecure}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          multiline={multiline}
          numberOfLines={numberOfLines}
          editable={!disabled}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          style={[
            styles.input,
            {
              color: disabled ? theme.colors.text.disabled : theme.colors.text.primary,
              paddingLeft: leftIcon ? 40 : 14,
              paddingRight: isPasswordField || rightIcon ? 42 : 14,
            },
            multiline && styles.multiline,
            inputStyle,
          ]}
        />

        {/* Show/Hide Password Eye Toggle */}
        {isPasswordField && (
          <TouchableOpacity
            onPress={() => setShowPassword(!showPassword)}
            activeOpacity={0.7}
            style={styles.rightIconContainer}
            accessibilityRole="button"
            accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <AppIcon
              name={showPassword ? 'eyeOff' : 'eye'}
              color={showPassword ? theme.colors.brand.primary : theme.colors.text.tertiary}
              size={18}
            />
          </TouchableOpacity>
        )}

        {/* Generic Right Icon */}
        {!isPasswordField && rightIcon && (
          <TouchableOpacity
            onPress={onRightIconPress}
            disabled={!onRightIconPress}
            activeOpacity={onRightIconPress ? 0.7 : 1}
            style={styles.rightIconContainer}
          >
            <AppIcon
              name={rightIcon}
              color={theme.colors.text.tertiary}
              size={18}
            />
          </TouchableOpacity>
        )}
      </View>
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
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  leftIconContainer: {
    position: 'absolute',
    left: 12,
    zIndex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rightIconContainer: {
    position: 'absolute',
    right: 12,
    zIndex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
  },
  input: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 10,
  },
  multiline: {
    textAlignVertical: 'top',
    paddingTop: 12,
  },
});
