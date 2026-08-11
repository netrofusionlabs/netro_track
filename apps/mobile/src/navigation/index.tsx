import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { LoginScreen } from '../features/auth/screens/LoginScreen';
import { MpinScreen } from '../features/auth/screens/MpinScreen';
import { ConsentScreen } from '../features/auth/screens/ConsentScreen';
import { RoleNavigator } from './RoleNavigator';
import { useAuthStore } from '../features/auth/stores/authStore';
import { useConsentStore, isConsentValid } from '../shared/stores/consentStore';

const Stack = createStackNavigator();

export default function RootNavigator() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isMpinVerified = useAuthStore((state) => state.isMpinVerified);
  const consentState = useConsentStore();
  const consentAccepted = isConsentValid(consentState);

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : !isMpinVerified ? (
          <Stack.Screen name="MpinSetup" component={MpinScreen} />
        ) : !consentAccepted ? (
          <Stack.Screen name="Consent" component={ConsentScreen} />
        ) : (
          <Stack.Screen name="Main" component={RoleNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

