import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { AuthNavigator } from './AuthNavigator';
import { AppNavigator } from './AppNavigator';
import { RoleSelectionScreen } from '../screens/auth/RoleSelectionScreen';
import { theme } from '../theme/theme';

export const RootNavigator = () => {
  const { user, token, isLoading } = useAuth();
  
  console.log("🚦 [RootNavigator] Token actual:", token ? "EXISTE" : "NULO", "| Rol:", user?.role);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (token) {
    if (user?.role === 'pending') {
      return <RoleSelectionScreen />;
    }
    return <AppNavigator />;
  }

  return <AuthNavigator />;
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
