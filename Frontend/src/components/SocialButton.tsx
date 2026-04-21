import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme/theme';
import { i18n } from '../i18n';

interface SocialButtonProps {
  provider: 'google' | 'apple';
  onPress: () => void;
  style?: ViewStyle;
  disabled?: boolean;
  isLoading?: boolean;
}

export const SocialButton: React.FC<SocialButtonProps> = ({ 
  provider, 
  onPress, 
  style, 
  disabled = false,
  isLoading = false
}) => {
  const isApple = provider === 'apple';
  const providerName = isApple ? 'Apple' : 'Google';
  
  const textContent = (isApple && disabled) 
    ? i18n.t('social.apple_soon') 
    : i18n.t('social.continue_with', { provider: providerName });

  return (
    <TouchableOpacity 
      style={[
        styles.container, 
        style,
        disabled && styles.containerDisabled
      ]} 
      onPress={onPress} 
      activeOpacity={disabled ? 1 : 0.7}
      disabled={disabled || isLoading}
    >
      {isLoading ? (
        <ActivityIndicator color={theme.colors.text} size="small" />
      ) : (
        <>
          <Ionicons 
            name={isApple ? 'logo-apple' : 'logo-google'} 
            size={22} 
            color={disabled ? theme.colors.textSecondary : theme.colors.text} 
            style={[styles.icon, disabled && styles.iconDisabled]}
          />
          <Text style={[styles.text, disabled && styles.textDisabled]}>
            {textContent}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
    paddingVertical: theme.spacing.m,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.m,
  },
  containerDisabled: {
    opacity: 0.5,
    backgroundColor: theme.colors.surface,
    borderColor: 'transparent',
  },
  icon: {
    marginRight: theme.spacing.s,
  },
  iconDisabled: {
    // Opción para desaturar si fuera imagen, en Icon solo cambiamos color
  },
  text: {
    color: theme.colors.text,
    fontSize: theme.typography.sizes.body,
    fontWeight: theme.typography.weights.semibold,
  },
  textDisabled: {
    color: theme.colors.textSecondary,
  }
});
