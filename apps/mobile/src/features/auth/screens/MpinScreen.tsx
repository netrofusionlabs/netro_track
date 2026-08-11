import React, { useState } from 'react';
import {
  StyleSheet, View, Text, TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../../shared/theme/ThemeProvider';
import { typography } from '../../../shared/theme/typography';
import { AppIcon, BrandLogo } from '../../../shared/components';
import { useAuthStore } from '../stores/authStore';
import { api } from '../../../shared/services/api';

interface Props {
  /** When true, user already has an MPIN — show verify UI. When false, show setup UI. */
  mode: 'setup' | 'verify';
}

export function MpinScreen({ mode }: Props) {
  const theme = useTheme();
  const [pin, setPin] = useState<string>('');
  const [confirmPin, setConfirmPin] = useState<string>('');
  const [stage, setStage] = useState<'enter' | 'confirm'>('enter');
  const [loading, setLoading] = useState(false);

  const setMpinVerified = useAuthStore((state) => state.setMpinVerified);
  const setHasMpin = useAuthStore((state) => state.setHasMpin);
  const clearCredentials = useAuthStore((state) => state.clearCredentials);

  const isSetup = mode === 'setup';
  const activePin = stage === 'confirm' ? confirmPin : pin;

  const handleKeyPress = (num: string) => {
    if (loading || activePin.length >= 4) return;
    const newPin = activePin + num;

    if (stage === 'enter') {
      setPin(newPin);
      if (newPin.length === 4) {
        if (isSetup) {
          // Move to confirm stage
          setTimeout(() => setStage('confirm'), 150);
        } else {
          submitVerify(newPin);
        }
      }
    } else {
      // stage === 'confirm' (setup only)
      setConfirmPin(newPin);
      if (newPin.length === 4) {
        if (newPin !== pin) {
          Alert.alert('Mismatch', 'PINs do not match. Please try again.', [
            { text: 'Retry', onPress: resetSetup },
          ]);
        } else {
          submitSetup(newPin);
        }
      }
    }
  };

  const handleBackspace = () => {
    if (loading) return;
    if (stage === 'confirm') {
      setConfirmPin((p) => p.slice(0, -1));
    } else {
      setPin((p) => p.slice(0, -1));
    }
  };

  const resetSetup = () => {
    setPin('');
    setConfirmPin('');
    setStage('enter');
  };

  const submitSetup = async (mpin: string) => {
    setLoading(true);
    try {
      await api.post('/auth/mpin/setup', { mpin });
      setHasMpin(true);
      setMpinVerified(true);
    } catch (err: any) {
      const message = err.response?.data?.message ?? 'Failed to set MPIN. Please try again.';
      const isAuthError = err.response?.status === 401;
      if (isAuthError) {
        Alert.alert('Session Expired', 'Your login session expired. Please sign in again.', [
          { text: 'Sign In Again', onPress: () => { resetSetup(); clearCredentials(); } },
        ]);
      } else {
        Alert.alert('Error', message, [{ text: 'Retry', onPress: resetSetup }]);
      }
    } finally {
      setLoading(false);
    }
  };

  const submitVerify = async (mpin: string) => {
    setLoading(true);
    try {
      await api.post('/auth/mpin/verify', { mpin });
      setMpinVerified(true);
    } catch (err: any) {
      const message = err.response?.data?.message ?? 'Incorrect MPIN. Please try again.';
      const isAuthError = err.response?.status === 401 && message.toLowerCase().includes('token');
      if (isAuthError) {
        Alert.alert('Session Expired', 'Your login session expired. Please sign in again.', [
          { text: 'Sign In Again', onPress: () => { setPin(''); clearCredentials(); } },
        ]);
      } else {
        Alert.alert('Incorrect MPIN', message, [{ text: 'Retry', onPress: () => setPin('') }]);
      }
    } finally {
      setLoading(false);
    }
  };

  const subtitle = isSetup
    ? stage === 'enter'
      ? 'Choose a 4-digit passcode for quick access'
      : 'Re-enter your PIN to confirm'
    : 'Enter your 4-digit passcode to continue';

  const heading = isSetup
    ? stage === 'enter' ? 'Set Your MPIN' : 'Confirm MPIN'
    : 'Enter MPIN';

  const renderDot = (index: number) => {
    const filled = activePin.length > index;
    return (
      <View
        key={index}
        style={[
          styles.dot,
          {
            backgroundColor: loading
              ? theme.colors.text.tertiary
              : filled
              ? theme.colors.brand.primary
              : 'transparent',
            borderColor: filled || loading ? theme.colors.brand.primary : theme.colors.surface.border,
            borderWidth: filled || loading ? 0 : 2,
          },
        ]}
      />
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.surface.background }]}>
      <View style={styles.content}>
        <BrandLogo variant="mark" size={64} style={styles.brandLogo} />
        <Text style={[typography.displaySm, { color: theme.colors.text.primary, textAlign: 'center' }]}>
          {heading}
        </Text>
        <Text style={[typography.bodySm, { color: theme.colors.text.secondary, marginTop: 4, textAlign: 'center' }]}>
          {subtitle}
        </Text>

        <View style={styles.dotContainer}>
          {[0, 1, 2, 3].map(renderDot)}
        </View>

        {loading && (
          <ActivityIndicator color={theme.colors.brand.primary} style={{ marginBottom: 20 }} />
        )}

        <View style={[styles.keypad, { opacity: loading ? 0.4 : 1 }]}>
          {[['1', '2', '3'], ['4', '5', '6'], ['7', '8', '9']].map((row, rIdx) => (
            <View key={rIdx} style={styles.keypadRow}>
              {row.map((num) => (
                <TouchableOpacity
                  key={num}
                  onPress={() => handleKeyPress(num)}
                  disabled={loading}
                  activeOpacity={0.8}
                  style={[
                    styles.key,
                    {
                      backgroundColor: theme.colors.surface.card,
                      borderColor: theme.colors.surface.border,
                      borderRadius: theme.borderRadius.lg,
                    },
                  ]}
                >
                  <Text style={[typography.statValue, { color: theme.colors.text.primary }]}>{num}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ))}
          <View style={styles.keypadRow}>
            <View style={styles.keyEmpty} />
            <TouchableOpacity
              onPress={() => handleKeyPress('0')}
              disabled={loading}
              activeOpacity={0.8}
              style={[
                styles.key,
                {
                  backgroundColor: theme.colors.surface.card,
                  borderColor: theme.colors.surface.border,
                  borderRadius: theme.borderRadius.lg,
                },
              ]}
            >
              <Text style={[typography.statValue, { color: theme.colors.text.primary }]}>0</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleBackspace}
              disabled={loading}
              activeOpacity={0.8}
              style={[
                styles.key,
                {
                  backgroundColor: theme.colors.surface.card,
                  borderColor: theme.colors.surface.border,
                  borderRadius: theme.borderRadius.lg,
                },
              ]}
            >
              <AppIcon name="backspace" color={theme.colors.text.secondary} size={22} />
            </TouchableOpacity>
          </View>
        </View>

        {isSetup && stage === 'confirm' && (
          <TouchableOpacity onPress={resetSetup} style={styles.reloginBtn} activeOpacity={0.7}>
            <Text style={[typography.buttonSm, { color: theme.colors.brand.primary }]}>
              ← Change PIN
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          onPress={() => clearCredentials()}
          style={styles.reloginBtn}
          activeOpacity={0.7}
        >
          <Text style={[typography.buttonSm, { color: theme.colors.brand.primary }]}>
            ← Sign in with password
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  brandLogo: { marginBottom: 20 },
  dotContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 24, marginBottom: 32 },
  dot: { width: 16, height: 16, borderRadius: 8, marginHorizontal: 10 },
  keypad: { width: '100%', maxWidth: 280 },
  keypadRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  key: {
    width: 72,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  keyEmpty: { width: 72, height: 56 },
  reloginBtn: { marginTop: 16, padding: 12 },
});
