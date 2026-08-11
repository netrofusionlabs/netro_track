import React, { useEffect, useState } from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from './src/shared/theme/ThemeProvider';
import { QueryProvider } from './src/shared/providers/QueryProvider';
import { SplashScreen } from './src/shared/components/SplashScreen';
import { useAuthStore } from './src/features/auth/stores/authStore';
import { useConsentStore } from './src/shared/stores/consentStore';
import RootNavigator from './src/navigation/index';

const SPLASH_BACKGROUND = '#E8ECF0';

function useStoresHydrated(): boolean {
  const [hydrated, setHydrated] = useState(
    () => useAuthStore.persist.hasHydrated() && useConsentStore.persist.hasHydrated(),
  );

  useEffect(() => {
    const check = () => {
      setHydrated(
        useAuthStore.persist.hasHydrated() && useConsentStore.persist.hasHydrated(),
      );
    };

    check();
    const unsubAuth = useAuthStore.persist.onFinishHydration(check);
    const unsubConsent = useConsentStore.persist.onFinishHydration(check);
    return () => {
      unsubAuth();
      unsubConsent();
    };
  }, []);

  return hydrated;
}

function App() {
  const hydrated = useStoresHydrated();

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <QueryProvider>
          <StatusBar barStyle="dark-content" backgroundColor={SPLASH_BACKGROUND} />
          {hydrated ? <RootNavigator /> : <SplashScreen />}
        </QueryProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

export default App;
