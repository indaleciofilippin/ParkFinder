import React from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { CustomInput } from '../../components/CustomInput';
import { CustomButton } from '../../components/CustomButton';
import { theme } from '../../theme/theme';
import { Ionicons } from '@expo/vector-icons';
import { i18n } from '../../i18n';

export const RecoveryScreen = ({ navigation }: any) => {
  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Ionicons name="key-outline" size={40} color={theme.colors.primary} />
          </View>
          <Text style={styles.title}>{i18n.t('auth.reset_password')}</Text>
          <Text style={styles.subtitle}>{i18n.t('auth.reset_instructions')}</Text>
        </View>

        <View style={styles.form}>
          <CustomInput 
            iconName="mail-outline" 
            placeholder={i18n.t('auth.email')}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          
          <CustomButton 
            title={i18n.t('auth.send_instructions')} 
            onPress={() => {}} 
            style={styles.mainButton}
          />
          
          <CustomButton 
            title={i18n.t('auth.back_to_login')} 
            variant="text" 
            onPress={() => navigation.goBack()} 
            style={styles.backButton}
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
    alignItems: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.m,
  },
  title: {
    fontSize: theme.typography.sizes.h2,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.s,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: theme.typography.sizes.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: theme.spacing.m,
    lineHeight: 22,
  },
  form: {
    marginBottom: theme.spacing.l,
  },
  mainButton: {
    marginTop: theme.spacing.m,
    marginBottom: theme.spacing.l,
  },
  backButton: {
    alignSelf: 'center',
  }
});
