import React from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { CustomInput } from '../../components/CustomInput';
import { CustomButton } from '../../components/CustomButton';
import { SocialButton } from '../../components/SocialButton';
import { theme } from '../../theme/theme';
import { i18n } from '../../i18n';

export const RegisterScreen = ({ navigation }: any) => {
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
            placeholder={i18n.t('auth.full_name')}
            autoCapitalize="words"
          />
          <CustomInput 
            iconName="mail-outline" 
            placeholder={i18n.t('auth.email')}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <CustomInput 
            iconName="lock-closed-outline" 
            placeholder={i18n.t('auth.password')}
            isPassword
          />
          
          <CustomButton 
            title={i18n.t('auth.create_account')} 
            onPress={() => {}} 
            style={styles.mainButton}
          />
        </View>

        <View style={styles.dividerContainer}>
          <View style={styles.divider} />
          <Text style={styles.dividerText}>{i18n.t('auth.or_signup')}</Text>
          <View style={styles.divider} />
        </View>

        <View style={styles.socialContainer}>
          <SocialButton provider="google" onPress={() => {}} />
          <SocialButton provider="apple" onPress={() => {}} />
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
