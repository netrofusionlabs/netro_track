import React from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from './src/shared/theme/ThemeProvider';
import { QueryProvider } from './src/shared/providers/QueryProvider';
import RootNavigator from './src/navigation/index';

function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <QueryProvider>
          <StatusBar barStyle="default" />
          <RootNavigator />
        </QueryProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

export default App;
