import { StatusBar } from 'expo-status-bar';
import './src/i18n';
import { AuthNavigator } from './src/navigation/AuthNavigator';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { RootNavigator } from './src/navigation/RootNavigator';
import { AuthProvider } from './src/context/AuthContext';
import { WebAlert } from './src/components/WebAlert';
import { Platform } from 'react-native';

if (Platform.OS === 'web') {
  // Inject global CSS for Leaflet map zoom controls so they don't overlap the back button
  const style = document.createElement('style');
  style.type = 'text/css';
  style.innerHTML = `
    .leaflet-top.leaflet-left {
      top: 80px !important;
    }
  `;
  document.head.appendChild(style);
}

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
      <WebAlert />
    </SafeAreaProvider>
  );
}
