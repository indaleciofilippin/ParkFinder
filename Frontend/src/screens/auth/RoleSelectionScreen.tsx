import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../../theme/theme';
import { useAuth } from '../../context/AuthContext';
import { userApi, saveToken } from '../../services/api';

export const RoleSelectionScreen = () => {
  const { user, setUser } = useAuth();
  const [selectedRole, setSelectedRole] = useState<'driver' | 'park' | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = async () => {
    if (!selectedRole) return;
    
    setIsLoading(true);
    try {
      const userId = user?.id_user_auth;
      if (!userId) {
        throw new Error("No se encontró el ID del usuario");
      }

      const updatedUser = await userApi.updateProfile(userId, { role: selectedRole });
      
      // Si el backend nos mandó un nuevo token (con el nuevo rol), lo guardamos
      if (updatedUser.access_token) {
        await saveToken('access_token', updatedUser.access_token);
      }

      setUser(updatedUser);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudo actualizar tu perfil');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>¿Cómo usarás la app?</Text>
          <Text style={styles.subtitle}>Selecciona la opción que mejor te describa para personalizar tu experiencia.</Text>
        </View>

        <View style={styles.cardsContainer}>
          <TouchableOpacity 
            style={[styles.card, selectedRole === 'driver' && styles.cardActive]}
            activeOpacity={0.8}
            onPress={() => setSelectedRole('driver')}
          >
            {selectedRole === 'driver' && (
              <LinearGradient
                colors={['rgba(36, 198, 165, 0.1)', 'rgba(36, 198, 165, 0)']}
                style={StyleSheet.absoluteFillObject}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
              />
            )}
            <View style={[styles.iconContainer, selectedRole === 'driver' && styles.iconContainerActive]}>
              <Ionicons 
                name="car-sport" 
                size={40} 
                color={selectedRole === 'driver' ? theme.colors.primary : theme.colors.textSecondary} 
              />
            </View>
            <Text style={[styles.cardTitle, selectedRole === 'driver' && styles.cardTitleActive]}>
              Soy Conductor
            </Text>
            <Text style={styles.cardDesc}>
              Quiero buscar y reservar lugares para estacionar mi vehículo.
            </Text>
            
            {selectedRole === 'driver' && (
              <View style={styles.checkmark}>
                <Ionicons name="checkmark-circle" size={24} color={theme.colors.primary} />
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.card, selectedRole === 'park' && styles.cardActive]}
            activeOpacity={0.8}
            onPress={() => setSelectedRole('park')}
          >
            {selectedRole === 'park' && (
              <LinearGradient
                colors={['rgba(36, 198, 165, 0.1)', 'rgba(36, 198, 165, 0)']}
                style={StyleSheet.absoluteFillObject}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
              />
            )}
            <View style={[styles.iconContainer, selectedRole === 'park' && styles.iconContainerActive]}>
              <Ionicons 
                name="business" 
                size={40} 
                color={selectedRole === 'park' ? theme.colors.primary : theme.colors.textSecondary} 
              />
            </View>
            <Text style={[styles.cardTitle, selectedRole === 'park' && styles.cardTitleActive]}>
              Tengo una Cochera
            </Text>
            <Text style={styles.cardDesc}>
              Quiero registrar mi espacio y administrar las reservas de conductores.
            </Text>
            
            {selectedRole === 'park' && (
              <View style={styles.checkmark}>
                <Ionicons name="checkmark-circle" size={24} color={theme.colors.primary} />
              </View>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity 
          style={[styles.confirmBtn, !selectedRole && styles.confirmBtnDisabled]}
          disabled={!selectedRole || isLoading}
          onPress={handleConfirm}
        >
          <LinearGradient
            colors={selectedRole ? [theme.colors.primary, '#24C6A5'] : ['#333', '#333']}
            style={styles.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            {isLoading ? (
              <ActivityIndicator color={theme.colors.background} />
            ) : (
              <Text style={[styles.confirmText, !selectedRole && styles.confirmTextDisabled]}>
                Continuar
              </Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    marginTop: 10,
    marginBottom: 30,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: theme.colors.text,
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    lineHeight: 24,
  },
  cardsContainer: {
    gap: 20,
    marginBottom: 30,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 24,
    padding: 24,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.05)',
    overflow: 'hidden',
  },
  cardActive: {
    borderColor: theme.colors.primary,
    backgroundColor: 'rgba(36, 198, 165, 0.05)',
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
  },
  iconContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconContainerActive: {
    backgroundColor: 'rgba(36, 198, 165, 0.15)',
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 8,
  },
  cardTitleActive: {
    color: theme.colors.primary,
  },
  cardDesc: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  checkmark: {
    position: 'absolute',
    top: 24,
    right: 24,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 20,
    paddingTop: 10,
  },
  confirmBtn: {
    borderRadius: 16,
    overflow: 'hidden',
    height: 60,
  },
  confirmBtnDisabled: {
    opacity: 0.7,
  },
  gradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmText: {
    color: theme.colors.background,
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  confirmTextDisabled: {
    color: 'rgba(255,255,255,0.3)',
  }
});
