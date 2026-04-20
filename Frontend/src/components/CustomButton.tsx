import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../theme/theme';

interface CustomButtonProps {
  title: string;
  onPress: () => void;
  style?: ViewStyle;
  variant?: 'primary' | 'outlined' | 'text';
}

export const CustomButton: React.FC<CustomButtonProps> = ({ title, onPress, style, variant = 'primary' }) => {

  if (variant === 'outlined') {
    return (
      <TouchableOpacity style={[styles.outlinedContainer, style]} onPress={onPress}>
        <Text style={styles.outlinedText}>{title}</Text>
      </TouchableOpacity>
    );
  }

  if (variant === 'text') {
    return (
      <TouchableOpacity style={[styles.textContainer, style]} onPress={onPress}>
        <Text style={styles.textBtn}>{title}</Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={[styles.wrapper, style]}>
      <LinearGradient
        colors={[theme.colors.primary, '#24C6A5']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <Text style={styles.primaryText}>{title}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: theme.borderRadius.medium,
    overflow: 'hidden',
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  gradient: {
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: theme.borderRadius.medium,
  },
  primaryText: {
    color: theme.colors.background, // Dark text on light neon background
    fontSize: theme.typography.sizes.body,
    fontWeight: theme.typography.weights.bold,
  },
  outlinedContainer: {
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.primary,
    borderRadius: theme.borderRadius.medium,
  },
  outlinedText: {
    color: theme.colors.primary,
    fontSize: theme.typography.sizes.body,
    fontWeight: theme.typography.weights.medium,
  },
  textContainer: {
    padding: theme.spacing.s,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textBtn: {
    color: theme.colors.primary,
    fontSize: theme.typography.sizes.body,
    fontWeight: theme.typography.weights.medium,
  }
});
