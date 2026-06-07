import { useEffect, useState } from 'react';
import { Alert, Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useAuth } from '../context/AuthContext';

// Permite a Expo cerrar el navegador interno cuando se completa el Auth
WebBrowser.maybeCompleteAuthSession();

import { GoogleSignin, isErrorWithCode, statusCodes } from '@react-native-google-signin/google-signin';

// Configuramos Google Sign In nativo
try {
  GoogleSignin.configure({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    offlineAccess: false,
  });
} catch (error) {
  console.log('Error configurando Google Sign In', error);
}

export const useSocialAuth = () => {
  const { socialLogin } = useAuth();
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isAppleLoading, setIsAppleLoading] = useState(false);

  // === EXPO GOOGLE AUTH LOGIC (Para Expo Go, Web o fallback) ===
  const [request, response, promptAsync] = Google.useAuthRequest({
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || 'unconfigured.apps.googleusercontent.com',
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || 'unconfigured.apps.googleusercontent.com',
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || 'unconfigured.apps.googleusercontent.com',
  });

  useEffect(() => {
    if (response?.type === 'success') {
      handleExpoGoogleResponse(response);
    }
  }, [response]);

  const handleExpoGoogleResponse = async (res: any) => {
    const { authentication } = res;
    setIsGoogleLoading(true);
    try {
      const userInfoResponse = await fetch('https://www.googleapis.com/userinfo/v2/me', {
        headers: { Authorization: `Bearer ${authentication?.accessToken}` },
      });
      const googleUser = await userInfoResponse.json();
      
      await socialLogin({
        email: googleUser.email,
        auth_provider: 'google',
        role: 'pending',
        provider_id: googleUser.id,
        first_name: googleUser.given_name || '',
        last_name: googleUser.family_name || ''
      });
      
    } catch (error: any) {
      console.error('Error Google Login:', error);
      Alert.alert('Error', 'No pudimos validar tu acceso con Google');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    // Si estamos en entorno web, forzamos usar el AuthSession de Expo en lugar del módulo nativo
    if (Platform.OS === 'web') {
      promptAsync();
      return;
    }

    // Si tenemos el módulo nativo cargado y no estamos en entorno de test, intentamos usar Google Sign In Nativo
    if (GoogleSignin && process.env.NODE_ENV !== 'test') {
      setIsGoogleLoading(true);
      try {
        await GoogleSignin.hasPlayServices();
        const userInfo = await GoogleSignin.signIn();
        
        if (userInfo.type === 'success') {
          const { user } = userInfo.data;
          await socialLogin({
            email: user.email,
            auth_provider: 'google',
            role: 'pending',
            provider_id: user.id,
            first_name: user.givenName || '',
            last_name: user.familyName || ''
          });
        }
      } catch (error: any) {
        if (isErrorWithCode && isErrorWithCode(error)) {
          if (error.code === statusCodes.SIGN_IN_CANCELLED) {
            // user cancelled the login flow
          } else if (error.code === statusCodes.IN_PROGRESS) {
            // operation (e.g. sign in) is in progress already
          } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
            Alert.alert('Error', 'Play Services no disponible o desactualizado');
          } else {
            console.error('Error Native Google Login:', error);
            Alert.alert('Error', 'Fallo al iniciar sesión con Google');
          }
        } else {
          console.error('Error Native Google Login:', error);
          Alert.alert('Error', 'Fallo al iniciar sesión con Google');
        }
      } finally {
        setIsGoogleLoading(false);
      }
    } else {
      // En Expo Go o Web usar Expo Auth Session
      if (!request) {
        Alert.alert('Error', 'Google Auth no está disponible aún');
        return;
      }
      promptAsync();
    }
  };

  // === APPLE AUTH LOGIC ===
  const signInWithApple = async () => {
    if (Platform.OS === 'web') {
      Alert.alert('No soportado', 'El inicio de sesión con Apple no está soportado en la versión Web actual.');
      return;
    }
    setIsAppleLoading(true);
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      
      const first_name = credential.fullName?.givenName || 'Usuario';
      const last_name = credential.fullName?.familyName || 'Apple';
      const apple_email = credential.email || `${credential.user}@apple.id`;

      await socialLogin({
        email: apple_email,
        auth_provider: 'apple',
        role: 'pending',
        provider_id: credential.user,
        first_name,
        last_name
      });
      
    } catch (e: any) {
      if (e.code !== 'ERR_CANCELED') {
        console.error('Error Apple Login:', e);
        Alert.alert('Error', 'Fallo al iniciar sesión con Apple');
      }
    } finally {
      setIsAppleLoading(false);
    }
  };

  return {
    signInWithGoogle,
    signInWithApple,
    isGoogleLoading,
    isAppleLoading,
    isGoogleAvailable: true,
  };
};
