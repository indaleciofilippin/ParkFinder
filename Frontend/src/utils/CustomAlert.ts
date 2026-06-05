import { Alert, Platform } from 'react-native';
import { showWebAlert } from '../components/WebAlert';

export const CustomAlert = {
  alert: (title: string, message?: string, buttons?: any[], options?: any) => {
    if (Platform.OS === 'web') {
      showWebAlert(title, message || '');
    } else {
      Alert.alert(title, message, buttons, options);
    }
  }
};
