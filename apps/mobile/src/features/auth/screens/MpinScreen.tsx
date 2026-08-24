import { lightTheme as theme } from "../../../shared/theme/tokens";

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
import NetInfo from '@react-native-community/netinfo';
import { storage } from '../../../shared/utils/storage';

const LOCAL_SALT = 'netrotrack_local_mpin_salt';

function sha256(ascii: string): string {
  function rightRotate(value: number, amount: number) {
    return (value >>> amount) | (value << (32 - amount));
  }
  
  const words: number[] = [];
  const asciiLength = ascii.length;
  for (let i = 0; i < asciiLength; i++) {
    words[i >> 2] |= (ascii.charCodeAt(i) & 0xff) << (24 - (i % 4) * 8);
  }
  
  words[asciiLength >> 2] |= 0x80 << (24 - (asciiLength % 4) * 8);
  const wordsLength = ((asciiLength + 8) >> 6) * 16 + 16;
  words[wordsLength - 1] = asciiLength * 8;
  
  const hash = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
  ];
  
  const k = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc0715ffe, 0xf2722c20, 0xfa26d329, 0x30d06d72, 0x0a1d193e,
    0x40348a24, 0x490a14fe, 0xfe65de84, 0x30931557, 0x681d616a, 0x78a4505f, 0xbe2dbba4, 0x5cb0a9dc,
    0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351
  ];
  
  const w = new Array(64);
  
  for (let i = 0; i < wordsLength; i += 16) {
    let a = hash[0];
    let b = hash[1];
    let c = hash[2];
    let d = hash[3];
    let e = hash[4];
    let f = hash[5];
    let g = hash[6];
    let h = hash[7];
    
    for (let j = 0; j < 64; j++) {
      if (j < 16) {
        w[j] = words[i + j] | 0;
      } else {
        const s0 = rightRotate(w[j - 15], 7) ^ rightRotate(w[j - 15], 18) ^ (w[j - 15] >>> 3);
        const s1 = rightRotate(w[j - 2], 17) ^ rightRotate(w[j - 2], 19) ^ (w[j - 2] >>> 10);
        w[j] = (w[j - 16] + s0 + w[j - 7] + s1) | 0;
      }
      
      const s0 = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (s0 + maj) | 0;
      const s1 = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25);
      const ch = (e & f) ^ (~e & g);
      const t1 = (h + s1 + ch + k[j] + w[j]) | 0;
      
      h = g;
      g = f;
      f = e;
      e = (d + t1) | 0;
      d = c;
      c = b;
      b = a;
      a = (t1 + t2) | 0;
    }
    
    hash[0] = (hash[0] + a) | 0;
    hash[1] = (hash[1] + b) | 0;
    hash[2] = (hash[2] + c) | 0;
    hash[3] = (hash[3] + d) | 0;
    hash[4] = (hash[4] + e) | 0;
    hash[5] = (hash[5] + f) | 0;
    hash[6] = (hash[6] + g) | 0;
    hash[7] = (hash[7] + h) | 0;
  }
  
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += ('00000000' + (hash[i] >>> 0).toString(16)).slice(-8);
  }
  return result;
}

function hashMpin(mpin: string): string {
  return sha256(mpin + LOCAL_SALT);
}

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
      const netInfoState = await NetInfo.fetch();
      const isOnline = netInfoState.isConnected === true && netInfoState.isInternetReachable !== false;

      if (!isOnline) {
        Alert.alert(
          'Offline Mode',
          'Setting up a new MPIN requires an active internet connection. Please connect to the internet to configure your MPIN.',
          [{ text: 'OK', onPress: () => resetSetup() }]
        );
        return;
      }

      await api.post('/auth/mpin/setup', { mpin });
      storage.set('local_mpin_hash', hashMpin(mpin));
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
      const netInfoState = await NetInfo.fetch();
      const isOnline = netInfoState.isConnected === true && netInfoState.isInternetReachable !== false;

      if (!isOnline) {
        const storedHash = storage.getString('local_mpin_hash');
        if (!storedHash) {
          Alert.alert(
            'Offline Authentication',
            "You are offline and haven't verified your MPIN on this device yet. Please connect to the internet to verify your MPIN.",
            [{ text: 'OK', onPress: () => setPin('') }]
          );
          return;
        }

        if (storedHash === hashMpin(mpin)) {
          setMpinVerified(true);
        } else {
          Alert.alert('Incorrect MPIN', 'Incorrect MPIN. Please try again.', [{ text: 'Retry', onPress: () => setPin('') }]);
        }
        return;
      }

      await api.post('/auth/mpin/verify', { mpin });
      storage.set('local_mpin_hash', hashMpin(mpin));
      setMpinVerified(true);
    } catch (err: any) {
      const message = err.response?.data?.message ?? 'Incorrect MPIN. Please try again.';
      const errCode = err.response?.data?.error?.code;

      if (errCode === 'MPIN_NOT_SET' || message.toLowerCase().includes('not configured')) {
        Alert.alert(
          'MPIN Not Configured',
          'MPIN has not been set up for this account yet. Would you like to configure your MPIN now?',
          [
            {
              text: 'Sign in with Password',
              onPress: () => {
                setPin('');
                clearCredentials();
              },
            },
            {
              text: 'Configure MPIN Now',
              style: 'default',
              onPress: () => {
                setPin('');
                setHasMpin(false);
              },
            },
          ]
        );
        return;
      }

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
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: theme.spacing.xxl },
  brandLogo: { marginBottom: theme.spacing.xl },
  dotContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: theme.spacing.xxl, marginBottom: theme.spacing.xxxl },
  dot: { width: 16, height: 16, borderRadius: 8, marginHorizontal: theme.spacing.md },
  keypad: { width: '100%', maxWidth: 280 },
  keypadRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: theme.spacing.md },
  key: {
    width: 72,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  keyEmpty: { width: 72, height: 56 },
  reloginBtn: { marginTop: theme.spacing.xl, padding: theme.spacing.md },
});
