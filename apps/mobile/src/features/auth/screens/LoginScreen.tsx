import React, { useState } from 'react';
import {
  TouchableOpacity,
  View,
  Text,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';
import { useTheme } from '../../../shared/theme/ThemeProvider';
import { typography } from '../../../shared/theme/typography';
import { Input, Button, Card, BrandLogo } from '../../../shared/components';
import { useAuthStore } from '../stores/authStore';
import { BASE_URL } from '../../../shared/services/api';

const API_URL = BASE_URL;

export function LoginScreen({ navigation }: { navigation: any }) {
  const theme = useTheme();
  const setCredentials = useAuthStore((state) => state.setCredentials);

  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const handleLogin = async () => {
    setErrors({});

    if (!loginId.trim()) {
      setErrors((prev) => ({ ...prev, loginId: 'Login ID or Email is required' }));
      return;
    }
    if (!password) {
      setErrors((prev) => ({ ...prev, password: 'Password is required' }));
      return;
    }

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
          appVersion: '1.0.0',
        }
      );

      const { accessToken, refreshToken, user } = response.data.data;
      setCredentials({ user, accessToken, refreshToken, loginId: loginId.trim() });


    } catch (error: any) {
      if (error.response?.data?.error?.code === 'VALIDATION_ERROR' && error.response?.data?.error?.details) {
        const backendErrors: { [key: string]: string } = {};
        error.response.data.error.details.forEach((err: any) => {
          backendErrors[err.field] = err.message;
        });
        setErrors(backendErrors);
      } else {
        const message = error.response?.data?.message || 'Login failed. Please check your credentials.';
        Alert.alert('Login Error', message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.surface.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {/* Hero Branding */}
          <View style={styles.brandHero}>
            <BrandLogo variant="banner" size={300} />
          </View>

          {/* Login Card */}
          <Card variant="elevated" style={styles.loginCard}>
            <Text style={[typography.headingMd, { color: theme.colors.text.primary, marginBottom: 4 }]}>
              Welcome Back
            </Text>
            <Text style={[typography.caption, { color: theme.colors.text.secondary, marginBottom: 20 }]}>
              Sign in with your enterprise credentials
            </Text>

            <Input
              label="Login ID or Email"
              value={loginId}
              onChangeText={setLoginId}
              placeholder="e.g. NETRO-EMP001 or employee@netro.com"
              leftIcon="profile"
              error={errors.loginId}
              autoCapitalize="none"
            />

            <Input
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              leftIcon="lock"
              isPassword
              error={errors.password}
              autoCapitalize="none"
            />

            <Button
              label="Sign In"
              onPress={handleLogin}
              loading={loading}
              fullWidth
              size="lg"
              style={{ marginTop: 8 }}
            />
          </Card>

          {/* Quick Demo Test Accounts (Tap to Autofill) */}
          <View style={styles.demoSection}>
            <Text style={[typography.caption, { color: theme.colors.text.secondary, marginBottom: 8, textAlign: 'center', fontWeight: '600' }]}>
              Quick Demo Accounts (Tap to Autofill)
            </Text>
            <View style={styles.demoChipsRow}>
              {[
                { label: 'Company Admin (Infobell)', loginId: 'IB-CA01', password: 'Password123!' },
                { label: 'Super Admin (NetroTrack)', loginId: 'NETRO-EMP001', password: 'Password123!' },
                { label: 'Master Super Admin', loginId: 'NETRO-MASTER', password: 'Password123!' },
              ].map((acc) => (
                <TouchableOpacity
                  key={acc.loginId}
                  style={[
                    styles.demoChip,
                    { backgroundColor: theme.colors.surface.card, borderColor: theme.colors.brand.primary },
                  ]}
                  onPress={() => {
                    setLoginId(acc.loginId);
                    setPassword(acc.password);
                    setErrors({});
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[typography.bodySm, { color: theme.colors.brand.primary, fontWeight: '700' }]}>
                    {acc.label}
                  </Text>
                  <Text style={[typography.caption, { color: theme.colors.text.secondary, marginTop: 2 }]}>
                    {acc.loginId} · Password123!
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Footer */}
          <Text style={[typography.caption, { color: theme.colors.text.tertiary, textAlign: 'center', marginTop: 24 }]}>
            Powered by NetroFusion Labs
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingVertical: 32,
    justifyContent: 'center',
  },
  brandHero: {
    alignItems: 'center',
    marginBottom: 28,
  },
  loginCard: {
    padding: 20,
  },
  demoSection: {
    marginTop: 20,
  },
  demoChipsRow: {
    alignItems: 'center',
    gap: 8,
  },
  demoChip: {
    width: '100%',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
  },
});
