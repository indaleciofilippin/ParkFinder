import { StatusBar } from 'expo-status-bar';
import './src/i18n';
import { AuthNavigator } from './src/navigation/AuthNavigator';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { RootNavigator } from './src/navigation/RootNavigator';
import { AuthProvider } from './src/context/AuthContext';

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationContainer>
          <RootNavigator />
          {/* light status bar suits the dark theme */}
          <StatusBar style="light" /> 
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
