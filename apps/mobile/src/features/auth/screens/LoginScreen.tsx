import React, { useState, useEffect } from 'react';
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
import { Input, Button, Card, BrandLogo, Badge } from '../../../shared/components';
import { useAuthStore } from '../stores/authStore';
import { BASE_URL } from '../../../shared/services/api';

const API_URL = BASE_URL;

interface DemoUserItem {
  id: string;
  name: string;
  loginId: string;
  email: string;
  role: string;
  roleLabel: string;
  designation?: string | null;
  defaultPassword?: string;
  defaultMpin?: string;
}

interface DemoTenantRole {
  role: string;
  roleLabel: string;
  roleOrder: number;
  users: DemoUserItem[];
}

interface DemoTenantItem {
  companyId: string;
  companyName: string;
  companyCode: string;
  roles: DemoTenantRole[];
  userCount: number;
}

export function LoginScreen({ navigation }: { navigation: any }) {
  const theme = useTheme();
  const setCredentials = useAuthStore((state) => state.setCredentials);

  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Demo accounts data
  const [demoTenants, setDemoTenants] = useState<DemoTenantItem[]>([]);
  const [selectedTenantCode, setSelectedTenantCode] = useState<string>('NETRO');

  useEffect(() => {
    let isMounted = true;
    axios
      .get<{ success: boolean; data: { tenants: DemoTenantItem[] } }>(`${API_URL}/api/v1/auth/demo-users`)
      .then((res) => {
        if (isMounted && res.data?.data?.tenants) {
          const tenants = res.data.data.tenants;
          setDemoTenants(tenants);
          if (tenants.length > 0) {
            setSelectedTenantCode(tenants[0].companyCode);
          }
        }
      })
      .catch(() => {
        // Fallback gracefully to default static accounts
      });

    return () => {
      isMounted = false;
    };
  }, []);

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

  const selectedTenant = demoTenants.find((t) => t.companyCode === selectedTenantCode) || demoTenants[0];

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

          {/* Quick Demo Test Accounts (Organized by Tenant & Access Role) */}
          {demoTenants.length > 0 && (
            <View style={styles.demoSection}>
              <Text style={[typography.caption, { color: theme.colors.text.secondary, marginBottom: 10, textAlign: 'center', fontWeight: '700' }]}>
                Quick Demo Logins (Grouped by Tenant & Role)
              </Text>

              {/* Tenant Filter Pills */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tenantPillsRow}>
                {demoTenants.map((t) => {
                  const isSelected = selectedTenantCode === t.companyCode;
                  return (
                    <TouchableOpacity
                      key={t.companyCode}
                      onPress={() => setSelectedTenantCode(t.companyCode)}
                      style={[
                        styles.tenantPill,
                        {
                          backgroundColor: isSelected ? theme.colors.brand.primary : theme.colors.surface.card,
                          borderColor: isSelected ? theme.colors.brand.primary : theme.colors.surface.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          typography.caption,
                          {
                            color: isSelected ? '#ffffff' : theme.colors.text.primary,
                            fontWeight: isSelected ? '700' : '500',
                          },
                        ]}
                      >
                        {t.companyName} ({t.companyCode})
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Selected Tenant Users Grouped by Access Role */}
              {selectedTenant && (
                <View style={styles.roleGroupList}>
                  {selectedTenant.roles.map((rg) => (
                    <View key={rg.role} style={styles.roleBlock}>
                      <Text style={[typography.caption, { color: theme.colors.brand.primary, fontWeight: '700', marginBottom: 6 }]}>
                        {rg.roleLabel}
                      </Text>
                      <View style={styles.usersGrid}>
                        {rg.users.map((u) => (
                          <TouchableOpacity
                            key={u.id}
                            style={[
                              styles.userCard,
                              {
                                backgroundColor: theme.colors.surface.card,
                                borderColor: theme.colors.surface.border,
                              },
                            ]}
                            onPress={() => {
                              setLoginId(u.loginId);
                              setPassword(u.defaultPassword || 'Password123!');
                              setErrors({});
                            }}
                            activeOpacity={0.7}
                          >
                            <Text style={[typography.bodySm, { color: theme.colors.text.primary, fontWeight: '600' }]} numberOfLines={1}>
                              {u.name}
                            </Text>
                            <Text style={[typography.caption, { color: theme.colors.text.secondary, fontSize: 11 }]} numberOfLines={1}>
                              {u.designation || u.roleLabel}
                            </Text>
                            <Text style={[typography.caption, { color: theme.colors.brand.primary, fontSize: 10, fontWeight: '700', marginTop: 2 }]}>
                              {u.loginId}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

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
    marginTop: 24,
  },
  tenantPillsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 8,
    marginBottom: 12,
  },
  tenantPill: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  roleGroupList: {
    gap: 12,
  },
  roleBlock: {
    marginBottom: 4,
  },
  usersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  userCard: {
    width: '48%',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
});
