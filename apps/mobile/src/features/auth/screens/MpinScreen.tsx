import React, { useState } from 'react';
import {
  StyleSheet, View, Text, SafeAreaView, TouchableOpacity, ActivityIndicator, Alert
} from 'react-native';
import { useTheme } from '../../../shared/theme/ThemeProvider';
import { useAuthStore } from '../stores/authStore';
import { api } from '../../../shared/services/api';

export function MpinScreen({ navigation: _navigation }: any) {
  const theme = useTheme();
  const [pin, setPin] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const setMpinVerified = useAuthStore((state) => state.setMpinVerified);

  const handleKeyPress = (num: string) => {
    if (loading || pin.length >= 4) return;
    const newPin = pin + num;
    setPin(newPin);
    if (newPin.length === 4) {
      verifyMpin(newPin);
    }
  };

  const handleBackspace = () => {
    if (!loading) setPin((p) => p.slice(0, -1));
  };

  const verifyMpin = async (mpin: string) => {
    setLoading(true);
    try {
      // The user just logged in with their password — set/overwrite their MPIN.
      // Uses the access token already injected by the api interceptor.
      await api.post('/auth/mpin/setup', { mpin });
      setMpinVerified(true);
    } catch (err: any) {
      const message = err.response?.data?.message ?? 'Failed to set MPIN. Please try again.';
      Alert.alert('MPIN Error', message, [
        { text: 'Retry', onPress: () => setPin('') }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const renderDot = (index: number) => {
    const filled = pin.length > index;
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
            borderColor: theme.colors.text.secondary,
            borderWidth: filled || loading ? 0 : 2
          }
        ]}
      />
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.surface.background }]}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: theme.colors.text.primary, marginBottom: theme.spacing.sm }]}>
          Enter MPIN
        </Text>
        <Text style={[styles.subtitle, { color: theme.colors.text.secondary, marginBottom: theme.spacing.xl }]}>
          Enter your 4-digit daily passcode
        </Text>

        <View style={[styles.dotContainer, { marginBottom: theme.spacing.xxxl }]}>
          {[0, 1, 2, 3].map(renderDot)}
        </View>

        {loading && (
          <ActivityIndicator color={theme.colors.brand.primary} style={{ marginBottom: 24 }} />
        )}

        <View style={[styles.keypad, { opacity: loading ? 0.4 : 1 }]}>
          {[['1', '2', '3'], ['4', '5', '6'], ['7', '8', '9']].map((row, rIdx) => (
            <View key={rIdx} style={styles.keypadRow}>
              {row.map((num) => (
                <TouchableOpacity
                  key={num}
                  onPress={() => handleKeyPress(num)}
                  disabled={loading}
                  style={[styles.key, { backgroundColor: theme.colors.surface.card }]}
                >
                  <Text style={[styles.keyText, { color: theme.colors.text.primary }]}>{num}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ))}
          <View style={styles.keypadRow}>
            <View style={styles.keyEmpty} />
            <TouchableOpacity
              onPress={() => handleKeyPress('0')}
              disabled={loading}
              style={[styles.key, { backgroundColor: theme.colors.surface.card }]}
            >
              <Text style={[styles.keyText, { color: theme.colors.text.primary }]}>0</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleBackspace}
              disabled={loading}
              style={[styles.key, { backgroundColor: theme.colors.surface.card }]}
            >
              <Text style={[styles.keyText, { color: theme.colors.semantic.error }]}>⌫</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  title: { fontSize: 24, fontWeight: '700' },
  subtitle: { fontSize: 16 },
  dotContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  dot: { width: 20, height: 20, borderRadius: 10, marginHorizontal: 12 },
  keypad: { width: '100%', paddingHorizontal: 20 },
  keypadRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  key: {
    width: 70, height: 70, borderRadius: 35,
    justifyContent: 'center', alignItems: 'center',
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.1,
    shadowRadius: 4, shadowOffset: { width: 0, height: 2 }
  },
  keyText: { fontSize: 24, fontWeight: '600' },
  keyEmpty: { width: 70, height: 70 }
});
