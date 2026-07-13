import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { LoginScreen } from '../features/auth/screens/LoginScreen';
import { MpinScreen } from '../features/auth/screens/MpinScreen';
import { useAuthStore } from '../features/auth/stores/authStore';

const Stack = createStackNavigator();

export default function RootNavigator() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : (
          <Stack.Screen name="MpinSetup" component={MpinScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
