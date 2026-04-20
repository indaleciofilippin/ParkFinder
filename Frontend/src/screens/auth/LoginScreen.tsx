import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import * as Google from 'expo-auth-session/providers/google';
import * as AppleAuthentication from 'expo-apple-authentication';
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native';
import { CustomInput } from '../../components/CustomInput';
import { CustomButton } from '../../components/CustomButton';
import { SocialButton } from '../../components/SocialButton';
import { theme } from '../../theme/theme';
import { i18n } from '../../i18n';
import { useAuth } from '../../context/AuthContext';

// Permite a Expo cerrar el navegador interno cuando se completa el Auth
WebBrowser.maybeCompleteAuthSession();

export const LoginScreen = ({ navigation }: any) => {
  const { login, socialLogin } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // === HOOKS GOOGLE AUTH ===
  // Expo inyectará automáticamente los valores de tu archivo .env que comiencen con EXPO_PUBLIC_
  const [request, response, promptAsync] = Google.useAuthRequest({
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || 'unconfigured.apps.googleusercontent.com',
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || 'unconfigured.apps.googleusercontent.com',
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || 'unconfigured.apps.googleusercontent.com',
  });

  useEffect(() => {
    handleGoogleResponse();
  }, [response]);

  const handleGoogleResponse = async () => {
    if (response?.type === 'success') {
      const { authentication } = response;
      try {
        // Traemos los datos de Google con el token nativo
        const userInfoResponse = await fetch('https://www.googleapis.com/userinfo/v2/me', {
          headers: { Authorization: `Bearer ${authentication?.accessToken}` },
        });
        const googleUser = await userInfoResponse.json();
        
        // Enviamos al Backend para el cruce de datos y Login/Register
        await socialLogin({
          email: googleUser.email,
          auth_provider: 'google',
          provider_id: googleUser.id,
          first_name: googleUser.given_name || '',
          last_name: googleUser.family_name || ''
        });
        Alert.alert('¡Bienvenido!', 'Sesión iniciada con Google');
      } catch (error: any) {
        // IMPORTANTE: Si el usuario no existe en Postgres, mándalo a RegisterScreen o regístralo aquí.
        Alert.alert('Error', 'No pudimos validar tu acceso');
      }
    }
  };

  // === HOOK APPLE AUTH ===
  const handleAppleAuth = async () => {
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      // El nombre y correo solo vienen la PRIMERA VEZ que el usuario se loguea.
      const first_name = credential.fullName?.givenName || 'Usuario';
      const last_name = credential.fullName?.familyName || 'Apple';
      const apple_email = credential.email || `${credential.user}@apple.id`;

      await socialLogin({
        email: apple_email,
        auth_provider: 'apple',
        provider_id: credential.user, // ID único criptográfico de Apple
        first_name,
        last_name
      });
      Alert.alert('¡Bienvenido!', 'Sesión iniciada con Apple');
    } catch (e: any) {
      if (e.code === 'ERR_CANCELED') {
        // Usuario cerró el modal
      } else {
        Alert.alert('Error', 'Fallo en iniciar sesión con Apple');
      }
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Ingresa tu correo y contraseña');
      return;
    }
    
    setIsLoading(true);
    try {
      await login(email, password);
      // El estado global de AuthContext debería actualizarse 
      // y si hay un AppNavigator, cambiará automáticamente de pantalla.
      Alert.alert('¡Bienvenido!', 'Sesión iniciada correctamente');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Credenciales incorrectas');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        <View style={styles.header}>
          <Text style={styles.title}>{i18n.t('auth.welcome_back')}</Text>
          <Text style={styles.subtitle}>{i18n.t('auth.discover_spot')}</Text>
        </View>

        <View style={styles.form}>
          <CustomInput 
            iconName="mail-outline" 
            placeholder={i18n.t('auth.email')}
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />
          <CustomInput 
            iconName="lock-closed-outline" 
            placeholder={i18n.t('auth.password')}
            isPassword
            value={password}
            onChangeText={setPassword}
          />
          
          <View style={styles.forgotPasswordContainer}>
            <CustomButton 
              title={i18n.t('auth.forgot_password')} 
              variant="text" 
              onPress={() => navigation.navigate('Recovery')} 
            />
          </View>
          
          <CustomButton 
            title={i18n.t('auth.login')} 
            onPress={handleLogin} 
            style={styles.mainButton}
            isLoading={isLoading}
          />
        </View>

        <View style={styles.dividerContainer}>
          <View style={styles.divider} />
          <Text style={styles.dividerText}>{i18n.t('auth.or')}</Text>
          <View style={styles.divider} />
        </View>

        <View style={styles.socialContainer}>
          <SocialButton provider="google" onPress={() => promptAsync()} disabled={!request} />
          <SocialButton provider="apple" onPress={handleAppleAuth} />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>{i18n.t('auth.no_account')}</Text>
          <CustomButton 
            title={i18n.t('auth.sign_up')} 
            variant="text" 
            style={styles.signupButton}
            onPress={() => navigation.navigate('Register')} 
          />
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    padding: theme.spacing.l,
    justifyContent: 'center',
  },
  header: {
    marginBottom: theme.spacing.xl,
    marginTop: theme.spacing.xxl,
  },
  title: {
    fontSize: theme.typography.sizes.h1,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    fontSize: theme.typography.sizes.body,
    color: theme.colors.textSecondary,
  },
  form: {
    marginBottom: theme.spacing.l,
  },
  forgotPasswordContainer: {
    alignItems: 'flex-end',
    marginBottom: theme.spacing.m,
  },
  mainButton: {
    marginTop: theme.spacing.s,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.l,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.border,
  },
  dividerText: {
    color: theme.colors.textSecondary,
    paddingHorizontal: theme.spacing.m,
    fontSize: theme.typography.sizes.small,
    fontWeight: theme.typography.weights.medium,
  },
  socialContainer: {
    marginBottom: theme.spacing.xl,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 'auto',
    marginBottom: theme.spacing.xl,
  },
  footerText: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.sizes.body,
  },
  signupButton: {
    padding: 0,
  }
});
