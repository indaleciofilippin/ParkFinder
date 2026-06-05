import React, { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native';
import { CustomInput } from '../../components/CustomInput';
import { CustomButton } from '../../components/CustomButton';
import { SocialButton } from '../../components/SocialButton';
import { theme } from '../../theme/theme';
import { i18n } from '../../i18n';
import { useAuth } from '../../context/AuthContext';
import { useSocialAuth } from '../../hooks/useSocialAuth';
import { CustomAlert } from '../../utils/CustomAlert';

export const LoginScreen = ({ navigation }: any) => {
  const { login } = useAuth();
  const { 
    signInWithGoogle, 
    signInWithApple, 
    isGoogleLoading, 
    isAppleLoading, 
    isGoogleAvailable 
  } = useSocialAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      CustomAlert.alert('Error', 'Ingresa tu correo y contraseña');
      return;
    }
    
    setIsLoading(true);
    try {
      await login(email, password);
      // El estado global de AuthContext debería actualizarse 
      // y si hay un AppNavigator, cambiará automáticamente de pantalla.
      CustomAlert.alert('¡Bienvenido!', 'Sesión iniciada correctamente');
    } catch (e: any) {
      CustomAlert.alert('Error', e.message || 'Credenciales incorrectas');
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
          <SocialButton 
            provider="google" 
            onPress={signInWithGoogle} 
            disabled={!isGoogleAvailable} 
            isLoading={isGoogleLoading}
          />
          <SocialButton 
            provider="apple" 
            onPress={signInWithApple} 
            disabled={true} 
            isLoading={isAppleLoading}
          />
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
