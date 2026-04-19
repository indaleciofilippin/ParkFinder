import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme/theme';
import { i18n } from '../i18n';

interface SocialButtonProps {
  provider: 'apple' | 'google';
  onPress: () => void;
  style?: ViewStyle;
}

export const SocialButton: React.FC<SocialButtonProps> = ({ provider, onPress, style }) => {
  const isApple = provider === 'apple';
  const providerName = isApple ? 'Apple' : 'Google';
  
  return (
    <TouchableOpacity style={[styles.container, style]} onPress={onPress} activeOpacity={0.7}>
      <Ionicons 
        name={isApple ? 'logo-apple' : 'logo-google'} 
        size={22} 
        color={theme.colors.text} 
        style={styles.icon}
      />
      <Text style={styles.text}>
        {i18n.t('social.continue_with', { provider: providerName })}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.medium,
    height: 56,
    marginBottom: theme.spacing.m,
  },
  icon: {
    marginRight: theme.spacing.m,
  },
  text: {
    color: theme.colors.text,
    fontSize: theme.typography.sizes.body,
    fontWeight: theme.typography.weights.medium,
  }
});
