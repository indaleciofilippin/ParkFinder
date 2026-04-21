import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../theme/theme';

interface CustomButtonProps {
  title: string;
  onPress: () => void;
  style?: ViewStyle;
  variant?: 'primary' | 'outlined' | 'text';
  isLoading?: boolean;
}

export const CustomButton: React.FC<CustomButtonProps> = ({ 
  title, 
  onPress, 
  style, 
  variant = 'primary',
  isLoading = false
}) => {

  const renderContent = () => {
    if (isLoading) {
      const spinnerColor = variant === 'primary' ? theme.colors.background : theme.colors.primary;
      return <ActivityIndicator color={spinnerColor} size="small" />;
    }
    
    let textStyle = styles.primaryText;
    if (variant === 'outlined') textStyle = styles.outlinedText;
    if (variant === 'text') textStyle = styles.textBtn;
    
    return <Text style={textStyle}>{title}</Text>;
  };

  if (variant === 'outlined') {
    return (
      <TouchableOpacity 
        style={[styles.outlinedContainer, style]} 
        onPress={onPress}
        disabled={isLoading}
        activeOpacity={0.7}
      >
        {renderContent()}
      </TouchableOpacity>
    );
  }

  if (variant === 'text') {
    return (
      <TouchableOpacity 
        style={[styles.textContainer, style]} 
        onPress={onPress}
        disabled={isLoading}
        activeOpacity={0.7}
      >
        {renderContent()}
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity 
      onPress={onPress} 
      activeOpacity={0.8} 
      style={[styles.wrapper, style]}
      disabled={isLoading}
    >
      <LinearGradient
        colors={[theme.colors.primary, '#24C6A5']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        {renderContent()}
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
