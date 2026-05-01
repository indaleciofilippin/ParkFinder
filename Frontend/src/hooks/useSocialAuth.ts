import { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useAuth } from '../context/AuthContext';

// Permite a Expo cerrar el navegador interno cuando se completa el Auth
WebBrowser.maybeCompleteAuthSession();

export const useSocialAuth = () => {
  const { socialLogin } = useAuth();
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isAppleLoading, setIsAppleLoading] = useState(false);

  // === GOOGLE AUTH LOGIC ===
  const [request, response, promptAsync] = Google.useAuthRequest({
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || 'unconfigured.apps.googleusercontent.com',
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || 'unconfigured.apps.googleusercontent.com',
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || 'unconfigured.apps.googleusercontent.com',
  });

  useEffect(() => {
    if (response?.type === 'success') {
      handleGoogleResponse(response);
    }
  }, [response]);

  const handleGoogleResponse = async (res: any) => {
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
    if (!request) {
      Alert.alert('Error', 'Google Auth no está disponible aún');
      return;
    }
    promptAsync();
  };

  // === APPLE AUTH LOGIC ===
  const signInWithApple = async () => {
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
    isGoogleAvailable: !!request,
  };
};
