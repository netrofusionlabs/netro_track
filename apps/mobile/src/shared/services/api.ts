import axios from 'axios';
import { Platform } from 'react-native';
import { storage } from '../utils/storage';
import { useAuthStore } from '../../features/auth/stores/authStore';
import { stopTracking } from './trackingService';

// Android emulator: localhost = 10.0.2.2; iOS simulator: localhost
export const BASE_URL =
  Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000';

export const api = axios.create({
  baseURL: `${BASE_URL}/api/v1`,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' }
});

// Inject access token before every request
api.interceptors.request.use((config) => {
  const raw = storage.getString('auth-store');
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as { state?: { accessToken?: string } };
      const token = parsed?.state?.accessToken;
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch {
      // ignore parse errors
    }
  }
  return config;
});

// Handle 401 Unauthorized / Expired Tokens -> Stop tracking & force redirect to Login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      console.warn('[api] Session expired (401). Redirecting to login...');
      void stopTracking();
      useAuthStore.getState().clearCredentials();
    }
    return Promise.reject(error);
  }
);
