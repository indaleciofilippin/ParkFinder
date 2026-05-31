import React, { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  LayoutAnimation,
  UIManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme/theme';
import { useAuth } from '../../context/AuthContext';
import { userApi, vehicleApi, parkingApi } from '../../services/api';
import { i18n } from '../../i18n';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

// Habilitar animaciones en Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export const ProfileScreen = ({ navigation }: any) => {
  const { user, setUser, logout } = useAuth();
  const [loading, setLoading] = useState(false);
  const [vehiclesLoading, setVehiclesLoading] = useState(false);
  
  // Profile state
  const [firstName, setFirstName] = useState(user?.profile?.first_name || '');
  const [lastName, setLastName] = useState(user?.profile?.last_name || '');
  const [phone, setPhone] = useState(user?.profile?.phone || '');
  
  // Vehicles state
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [newPlate, setNewPlate] = useState('');
  const [newModel, setNewModel] = useState('');
  const [isAddingVehicle, setIsAddingVehicle] = useState(false);

  const canManageVehicles = user?.role === 'driver' || user?.role === 'dev' || user?.role === 'admin';


  useFocusEffect(
    useCallback(() => {
      if (canManageVehicles) {
        fetchVehicles();
      }
    }, [canManageVehicles])
  );

  const fetchVehicles = async () => {
    setVehiclesLoading(true);
    try {
      const data = await vehicleApi.getVehicles();
      setVehicles(data);
    } catch (error) {
      console.error('Error fetching vehicles:', error);
    } finally {
      setVehiclesLoading(false);
    }
  };




  const handleUpdateProfile = async () => {
    setLoading(true);
    try {
      const updatedUser = await userApi.updateProfile(user.id_user_auth, {
        first_name: firstName,
        last_name: lastName,
        phone: phone,
      });
      setUser(updatedUser);
      Alert.alert(i18n.t('profile.title'), i18n.t('profile.success_update'));
    } catch (error: any) {
      Alert.alert('Error', error.message || i18n.t('profile.error_update'));
    } finally {
      setLoading(false);
    }
  };

  const handleAddVehicle = async () => {
    if (!newPlate || !newModel) {
      Alert.alert('Error', 'Por favor completa todos los campos');
      return;
    }

    const plateRegex = /^[A-Z]{3}\d{3}$|^[A-Z]{2}\d{3}[A-Z]{2}$/;
    const formattedPlate = newPlate.toUpperCase().replace(/\s/g, '');
    
    if (!plateRegex.test(formattedPlate)) {
      Alert.alert('Error', i18n.t('profile.vehicles.error_invalid_format'));
      return;
    }

    setVehiclesLoading(true);
    try {
      await vehicleApi.createVehicle({
        license_plate: formattedPlate,
        model: newModel,
      });
      setNewPlate('');
      setNewModel('');
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setIsAddingVehicle(false);
      fetchVehicles();
      Alert.alert(i18n.t('profile.vehicles.title'), i18n.t('profile.vehicles.success_add'));
    } catch (error: any) {
      Alert.alert('Error', error.message || i18n.t('profile.vehicles.error_add'));
    } finally {
      setVehiclesLoading(false);
    }
  };

  const handleDeleteVehicle = (id: number) => {
    Alert.alert(
      i18n.t('profile.vehicles.title'),
      i18n.t('profile.vehicles.delete_confirm'),
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Eliminar', 
          style: 'destructive',
          onPress: async () => {
            try {
              await vehicleApi.deleteVehicle(id);
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              fetchVehicles();
            } catch (error) {
              Alert.alert('Error', 'No se pudo eliminar el vehículo');
            }
          }
        }
      ]
    );
  };

  const toggleAddVehicle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.spring);
    setIsAddingVehicle(!isAddingVehicle);
  };




  const getInitials = () => {
    const f = firstName?.[0] || user?.email?.[0] || 'U';
    const l = lastName?.[0] || '';
    return (f + l).toUpperCase();
  };

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          
          {/* Top Hero Section */}
          <LinearGradient
            colors={[theme.colors.secondary, theme.colors.primary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroSection}
          >
            <SafeAreaView>
              <View style={styles.headerNav}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.glassButton}>
                  <Ionicons name="chevron-back" size={24} color="white" />
                </TouchableOpacity>
                <Text style={styles.heroTitle}>{i18n.t('profile.title')}</Text>
                <View style={{ width: 44 }} />
              </View>

              <View style={styles.avatarContainer}>
                <View style={styles.glassAvatar}>
                  <Text style={styles.avatarText}>{getInitials()}</Text>
                </View>
                <Text style={styles.heroName}>{firstName} {lastName}</Text>
                <Text style={styles.heroEmail}>{user?.email}</Text>
              </View>
            </SafeAreaView>
          </LinearGradient>

          <View style={styles.content}>
            {/* Account Info Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="person-circle-outline" size={26} color={theme.colors.primary} />
                  <Text style={styles.sectionTitle}>{i18n.t('profile.personal_data')}</Text>
                </View>
              </View>

              <View style={styles.formCard}>
                <View style={styles.inputGroup}>
                  <Ionicons name="text-outline" size={20} color={theme.colors.textSecondary} style={styles.inputIcon} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.minimalLabel}>{i18n.t('auth.first_name')}</Text>
                    <TextInput
                      style={styles.minimalInput}
                      value={firstName}
                      onChangeText={setFirstName}
                      placeholder="Nombre"
                      placeholderTextColor="rgba(255,255,255,0.3)"
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Ionicons name="text-outline" size={20} color={theme.colors.textSecondary} style={styles.inputIcon} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.minimalLabel}>{i18n.t('auth.last_name')}</Text>
                    <TextInput
                      style={styles.minimalInput}
                      value={lastName}
                      onChangeText={setLastName}
                      placeholder="Apellido"
                      placeholderTextColor="rgba(255,255,255,0.3)"
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Ionicons name="call-outline" size={20} color={theme.colors.textSecondary} style={styles.inputIcon} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.minimalLabel}>{i18n.t('profile.phone')}</Text>
                    <TextInput
                      style={styles.minimalInput}
                      value={phone}
                      onChangeText={setPhone}
                      placeholder="+54 9 ..."
                      placeholderTextColor="rgba(255,255,255,0.3)"
                      keyboardType="phone-pad"
                    />
                  </View>
                </View>

                <TouchableOpacity 
                  style={styles.actionButton} 
                  onPress={handleUpdateProfile}
                  disabled={loading}
                >
                  <LinearGradient
                    colors={[theme.colors.primary, '#24C6A5']}
                    style={styles.buttonGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    {loading ? (
                      <ActivityIndicator color={theme.colors.background} />
                    ) : (
                      <>
                        <Text style={styles.buttonText}>{i18n.t('profile.save_changes')}</Text>
                        <Ionicons name="checkmark-circle" size={20} color={theme.colors.background} />
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>

            {/* Garage Section */}
            {canManageVehicles && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name="car-sport-outline" size={26} color={theme.colors.secondary} />
                    <Text style={styles.sectionTitle}>{i18n.t('profile.vehicles.title')}</Text>
                  </View>
                  <TouchableOpacity 
                    onPress={toggleAddVehicle}
                    style={[styles.miniAddButton, isAddingVehicle && styles.miniAddButtonActive]}
                  >
                    <Ionicons name={isAddingVehicle ? "close" : "add"} size={24} color="white" />
                  </TouchableOpacity>
                </View>

                {isAddingVehicle && (
                  <View style={styles.addVehicleBox}>
                    <View style={styles.plateInputContainer}>
                      <TextInput
                        style={styles.plateInput}
                        value={newPlate}
                        onChangeText={setNewPlate}
                        placeholder="ABC 123"
                        placeholderTextColor="rgba(0,0,0,0.1)"
                        autoCapitalize="characters"
                        maxLength={7}
                      />
                    </View>
                    <TextInput
                      style={styles.modelInput}
                      value={newModel}
                      onChangeText={setNewModel}
                      placeholder={i18n.t('profile.vehicles.model')}
                      placeholderTextColor="rgba(255,255,255,0.3)"
                    />
                    <TouchableOpacity 
                      style={styles.confirmVehicleBtn} 
                      onPress={handleAddVehicle}
                    >
                      <LinearGradient
                        colors={[theme.colors.primary, '#24C6A5']}
                        style={styles.confirmVehicleGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                      >
                        <Text style={styles.confirmVehicleText}>{i18n.t('profile.vehicles.register')}</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                )}

                {vehiclesLoading ? (
                  <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 20 }} />
                ) : vehicles?.length > 0 ? (
                  <View style={styles.vehiclesList}>
                    {vehicles.map((v) => (
                      <TouchableOpacity 
                        key={v.id_vehicle} 
                        style={styles.vehicleGlassCard}
                        onLongPress={() => handleDeleteVehicle(v.id_vehicle)}
                      >
                        <View style={styles.plateBadge}>
                          <View style={styles.plateHeader} />
                          <Text style={styles.plateText}>{v.license_plate}</Text>
                        </View>
                        <View style={styles.vehicleDetails}>
                          <Text style={styles.vehicleModelText}>{v.model}</Text>
                          <Ionicons name="chevron-forward" size={16} color={theme.colors.textSecondary} />
                        </View>
                        <TouchableOpacity 
                          style={styles.deleteIcon}
                          onPress={() => handleDeleteVehicle(v.id_vehicle)}
                        >
                          <Ionicons name="trash-outline" size={18} color={theme.colors.error} />
                        </TouchableOpacity>
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : !isAddingVehicle && (
                  <View style={styles.emptyState}>
                    <Ionicons name="car-outline" size={48} color="rgba(255,255,255,0.1)" />
                    <Text style={styles.emptyText}>{i18n.t('profile.vehicles.no_vehicles')}</Text>
                  </View>
                )}
              </View>
            )}



            {/* Logout Footer */}
            <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
              <Ionicons name="log-out-outline" size={20} color={theme.colors.error} />
              <Text style={styles.logoutText}>Cerrar Sesión</Text>
            </TouchableOpacity>

          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    flexGrow: 1,
  },
  heroSection: {
    paddingTop: Platform.OS === 'ios' ? 0 : 20,
    paddingBottom: 25,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.m,
  },
  glassButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: 'white',
    letterSpacing: 1,
  },
  avatarContainer: {
    alignItems: 'center',
    marginTop: 10,
  },
  glassAvatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'white',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '800',
    color: 'white',
  },
  heroName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  heroEmail: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  content: {
    padding: theme.spacing.m,
    marginTop: 20, // Más espacio entre el hero y el contenido
  },
  section: {
    marginBottom: 30,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    paddingHorizontal: 5,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: theme.colors.textSecondary,
    marginLeft: 12,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  formCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  inputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 16,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  inputIcon: {
    width: 40,
    textAlign: 'center',
  },
  minimalLabel: {
    fontSize: 9,
    color: theme.colors.primary,
    fontWeight: '700',
    marginBottom: 1,
    textTransform: 'uppercase',
  },
  minimalInput: {
    color: 'white',
    fontSize: 16,
    padding: 0,
    fontWeight: '600',
  },
  actionButton: {
    marginTop: 10,
    borderRadius: 16,
    overflow: 'hidden',
  },
  buttonGradient: {
    height: 52,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: theme.colors.background,
    fontWeight: '900',
    fontSize: 15,
    marginRight: 10,
  },
  miniAddButton: {
    width: 40,
    height: 40,
    borderRadius: 12, // Cambiado a cuadrado redondeado para consistencia
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  miniAddButtonActive: {
    backgroundColor: theme.colors.error + '20',
    borderColor: theme.colors.error,
  },
  addVehicleBox: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: theme.colors.primary + '40', // Borde sutil del color de la marca
  },
  plateInputContainer: {
    backgroundColor: '#F0F0F0',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#222',
    marginBottom: 15,
  },
  plateInput: {
    fontSize: 28,
    fontWeight: '900',
    color: '#111',
    letterSpacing: 4,
    textAlign: 'center',
    width: '100%',
  },
  modelInput: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
  confirmVehicleBtn: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  confirmVehicleGradient: {
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmVehicleText: {
    color: theme.colors.background,
    fontWeight: '900',
    fontSize: 15,
    letterSpacing: 0.5,
  },
  vehiclesList: {
    gap: 12,
  },
  vehicleGlassCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 20,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  parkingGrid: {
    gap: 15,
  },
  premiumParkingCard: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  premiumParkingGradient: {
    padding: 20,
  },
  parkingCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  parkingMainInfo: {
    flex: 1,
  },
  premiumParkingName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusText: {
    fontSize: 10,
    color: theme.colors.textSecondary,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  miniDeleteBtn: {
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 10,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 16,
    padding: 15,
    marginBottom: 15,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 8,
    color: theme.colors.textSecondary,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 4,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  statDivider: {
    width: 1,
    height: '60%',
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignSelf: 'center',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoriesText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  parkingBadge: {
    backgroundColor: '#E8E8E8',
    borderRadius: 6,
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#222',
    marginRight: 15,
  },
  plateBadge: {
    backgroundColor: '#E8E8E8',
    borderRadius: 6,
    width: 80,
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#222',
    marginRight: 15,
  },
  plateHeader: {
    position: 'absolute',
    top: 0,
    width: '100%',
    height: 4,
    backgroundColor: '#0033A0',
    borderTopLeftRadius: 5,
    borderTopRightRadius: 5,
  },
  plateText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#222',
    letterSpacing: 1,
  },
  vehicleDetails: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  vehicleModelText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteIcon: {
    padding: 8,
    marginLeft: 5,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: 'rgba(255,255,255,0.01)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    borderStyle: 'dashed',
  },
  emptyText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
    marginTop: 15,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    padding: 15,
    marginBottom: 40,
  },
  logoutText: {
    color: theme.colors.error,
    fontWeight: 'bold',
    fontSize: 15,
    marginLeft: 10,
  }
});
