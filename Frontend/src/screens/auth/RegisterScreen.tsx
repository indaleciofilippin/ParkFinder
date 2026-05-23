import React, { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { CustomInput } from '../../components/CustomInput';
import { CustomButton } from '../../components/CustomButton';
import { SocialButton } from '../../components/SocialButton';
import { theme } from '../../theme/theme';
import { i18n } from '../../i18n';
import { useAuth } from '../../context/AuthContext';
import { useSocialAuth } from '../../hooks/useSocialAuth';

export const RegisterScreen = ({ navigation }: any) => {
  const { register } = useAuth();
  
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { 
    signInWithGoogle, 
    signInWithApple, 
    isGoogleLoading, 
    isAppleLoading, 
    isGoogleAvailable 
  } = useSocialAuth();

  const handleRegister = async () => {
    if (!firstName || !lastName || !email || !password || !confirmPassword) {
      Alert.alert('Error', 'Todos los campos son requeridos');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Las contraseñas no coinciden');
      return;
    }

    // Validar fortaleza de la contraseña
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>_+\-\[\]\\\/]).{8,}$/;
    if (!passwordRegex.test(password)) {
      Alert.alert(
        'Contraseña poco segura',
        'La contraseña debe tener al menos:\n• 8 caracteres\n• Una letra mayúscula\n• Una letra minúscula\n• Un número\n• Un carácter especial (ej: !, @, #, $, %, etc.)'
      );
      return;
    }
    
    setIsLoading(true);
    try {
      await register({
        email,
        password,
        auth_provider: 'local',
        role: 'pending',
        provider_id: null,
        first_name: firstName.trim(),
        last_name: lastName.trim()
      });
      Alert.alert('Éxito', 'Cuenta creada correctamente. Inicia sesión para continuar.');
      navigation.navigate('Login');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'No se pudo crear la cuenta');
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
          <Text style={styles.title}>{i18n.t('auth.create_account')}</Text>
          <Text style={styles.subtitle}>{i18n.t('auth.join_community')}</Text>
        </View>

        <View style={styles.form}>
          <CustomInput 
            iconName="person-outline" 
            placeholder={i18n.t('auth.first_name')}
            autoCapitalize="words"
            value={firstName}
            onChangeText={setFirstName}
          />
          <CustomInput 
            iconName="person-add-outline" 
            placeholder={i18n.t('auth.last_name')}
            autoCapitalize="words"
            value={lastName}
            onChangeText={setLastName}
          />
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
          <CustomInput 
            iconName="shield-checkmark-outline" 
            placeholder={i18n.t('auth.confirm_password')}
            isPassword
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />
          
          <CustomButton 
            title={i18n.t('auth.create_account')} 
            onPress={handleRegister} 
            style={styles.mainButton}
            isLoading={isLoading}
          />
        </View>

        <View style={styles.dividerContainer}>
          <View style={styles.divider} />
          <Text style={styles.dividerText}>{i18n.t('auth.or_signup')}</Text>
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
          <Text style={styles.footerText}>{i18n.t('auth.already_have_account')}</Text>
          <CustomButton 
            title={i18n.t('auth.login')} 
            variant="text" 
            style={styles.loginButton}
            onPress={() => navigation.goBack()} 
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
    marginTop: theme.spacing.m,
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
  mainButton: {
    marginTop: theme.spacing.m,
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
  loginButton: {
    padding: 0,
  }
});
