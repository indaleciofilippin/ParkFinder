import { StatusBar } from 'expo-status-bar';
import './src/i18n';
import { AuthNavigator } from './src/navigation/AuthNavigator';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <AuthNavigator />
        {/* light status bar suits the dark theme */}
        <StatusBar style="light" /> 
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
