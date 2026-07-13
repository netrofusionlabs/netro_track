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

  const [companyId, setCompanyId] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const handleLogin = async () => {
    // Basic frontend checks
    const newErrors: { [key: string]: string } = {};
    if (!companyId) newErrors.companyId = 'Company ID is required';
    if (!employeeId) newErrors.employeeId = 'Employee ID is required';
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
          companyId,
          employeeId,
          password,
          deviceId: 'device-id-uuid-placeholder', // Mocked device ID for now
          os: Platform.OS,
          model: Platform.Version.toString(),
          appVersion: '1.0.0'
        },
        {
          headers: {
            'x-company-id': companyId // tenant identification header
          }
        }
      );

      const { accessToken, refreshToken, user } = response.data.data;
      setCredentials({ user, accessToken, refreshToken });

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
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          <Text style={[styles.title, { color: theme.colors.text.primary, marginBottom: theme.spacing.xxs }]}>
            NetroTrack
          </Text>
          <Text style={[styles.subtitle, { color: theme.colors.text.secondary, marginBottom: theme.spacing.xl }]}>
            Track. Manage. Perform.
          </Text>

          <Input
            label="Company ID (UUID)"
            value={companyId}
            onChangeText={setCompanyId}
            placeholder="e.g. 123e4567-e89b-12d3-a456-426614174000"
            error={errors.companyId}
          />

          <Input
            label="Employee ID"
            value={employeeId}
            onChangeText={setEmployeeId}
            placeholder="e.g. EMP001"
            error={errors.employeeId}
          />

          <Input
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            secureTextEntry
            error={errors.password}
          />

          <Button
            label="Login"
            onPress={handleLogin}
            loading={loading}
            style={{ marginTop: theme.spacing.md }}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  keyboardView: {
    flex: 1
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    textAlign: 'center'
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center'
  }
});
