import React, { useState } from 'react';
import { StyleSheet, View, Text, SafeAreaView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useTheme } from '../../../shared/theme/ThemeProvider';
import { Input } from '../../../shared/components/Input';
import { Button } from '../../../shared/components/Button';
import { useAuthStore } from '../stores/authStore';
import axios from 'axios';

// Fallback IP for Android emulator (localhost is 10.0.2.2)
const API_URL = Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000';

export function LoginScreen({ navigation }: any) {
  const theme = useTheme();
  const setCredentials = useAuthStore((state) => state.setCredentials);
  const lastLoginId = useAuthStore((state) => state.lastLoginId);

  const [loginId, setLoginId] = useState(lastLoginId || '');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const handleLogin = async () => {
    const newErrors: { [key: string]: string } = {};
    if (!loginId) {
      newErrors.loginId = 'Login ID or Email is required';
    } else {
      const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(loginId);
      const parts = loginId.split('-');
      const isLoginId = parts.length >= 2 && parts[0].trim().length > 0 && parts[1].trim().length > 0;
      if (!isEmail && !isLoginId) {
        newErrors.loginId = 'Invalid format. Use COMPANY-EMPLOYEE or a valid email';
      }
    }
    if (!password) newErrors.password = 'Password is required';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setLoading(true);

    try {
      const response = await axios.post(
        `${API_URL}/api/v1/auth/login`,
        {
          loginId: loginId.trim(),
          password,
          deviceId: 'device-id-uuid-placeholder',
          os: Platform.OS,
          model: Platform.Version.toString(),
          appVersion: '1.0.0'
        }
      );

      const { accessToken, refreshToken, user } = response.data.data;
      setCredentials({ user, accessToken, refreshToken, loginId: loginId.trim() });

      Alert.alert('Success', 'Login successful!', [
        { text: 'OK', onPress: () => navigation.navigate('MpinSetup') }
      ]);
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to authenticate';
      Alert.alert('Login Failed', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.surface.background }]}>
      {/* Decorative Premium Background Accents */}
      <View style={[styles.blurAccentLeft, { backgroundColor: theme.colors.brand.primary }]} />
      <View style={[styles.blurAccentRight, { backgroundColor: theme.colors.brand.secondary }]} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          {/* Logo & Header */}
          <View style={styles.header}>
            <View style={[styles.logoContainer, { backgroundColor: theme.colors.surface.card, borderColor: theme.colors.surface.input }]}>
              <View style={[styles.logoDot, { backgroundColor: theme.colors.brand.primary }]} />
              <View style={[styles.logoRing, { borderColor: theme.colors.brand.secondary }]} />
            </View>
            <Text style={[styles.title, { color: theme.colors.text.primary }]}>
              NetroTrack
            </Text>
            <Text style={[styles.subtitle, { color: theme.colors.text.secondary }]}>
              Track. Manage. Perform.
            </Text>
          </View>

          {/* Login Card Form */}
          <View style={[
            styles.card, 
            { 
              backgroundColor: theme.colors.surface.card,
              borderColor: Platform.OS === 'ios' ? 'rgba(255,255,255,0.08)' : theme.colors.surface.input,
              borderRadius: theme.borderRadius.lg
            }
          ]}>
            <Text style={[styles.cardTitle, { color: theme.colors.text.primary, marginBottom: theme.spacing.lg }]}>
              Sign In
            </Text>

            <Input
              label="Login ID or Email"
              value={loginId}
              onChangeText={setLoginId}
              placeholder="e.g. Netro-emp001 or name@company.com"
              error={errors.loginId}
              autoCapitalize="none"
            />

            <Input
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              secureTextEntry
              error={errors.password}
              autoCapitalize="none"
            />

            <Button
              label="Login"
              onPress={handleLogin}
              loading={loading}
              style={{ marginTop: theme.spacing.md }}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden'
  },
  blurAccentLeft: {
    position: 'absolute',
    top: -120,
    left: -120,
    width: 320,
    height: 320,
    borderRadius: 160,
    opacity: 0.15,
    transform: [{ scale: 1.2 }]
  },
  blurAccentRight: {
    position: 'absolute',
    bottom: -120,
    right: -120,
    width: 320,
    height: 320,
    borderRadius: 160,
    opacity: 0.12,
    transform: [{ scale: 1.2 }]
  },
  keyboardView: {
    flex: 1
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    zIndex: 10
  },
  header: {
    alignItems: 'center',
    marginBottom: 36
  },
  logoContainer: {
    width: 72,
    height: 72,
    borderRadius: 24,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 12
      },
      android: {
        elevation: 2
      }
    })
  },
  logoDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    position: 'absolute'
  },
  logoRing: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 3,
    backgroundColor: 'transparent'
  },
  title: {
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -0.5,
    textAlign: 'center'
  },
  subtitle: {
    fontSize: 16,
    marginTop: 4,
    textAlign: 'center',
    fontWeight: '500'
  },
  card: {
    padding: 24,
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.08,
        shadowRadius: 24
      },
      android: {
        elevation: 4
      }
    })
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.2
  }
});
