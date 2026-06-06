import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, Dimensions, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { CustomAlert } from '../../utils/CustomAlert';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../../theme/theme';
import { parkingApi, categoryApi } from '../../services/api';
import { i18n } from '../../i18n';

const { width } = Dimensions.get('window');

export const ManageParkingScreen = ({ navigation, route }: any) => {
  const existingParking = route.params?.parking;
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  
  // Parking State
  const [name, setName] = useState(existingParking?.name || '');
  
  // Location State
  const [location, setLocation] = useState<any>(
    existingParking?.latitude && existingParking?.longitude 
    ? { latitude: existingParking.latitude, longitude: existingParking.longitude } 
    : null
  );
  
  // Categories State (local until saved)
  const [categories, setCategories] = useState<any[]>([]);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  
  // New Category Temporary State
  const [newCatName, setNewCatName] = useState('');
  const [newCatCapacity, setNewCatCapacity] = useState('');
  const [newCatPrice, setNewCatPrice] = useState('');

  useEffect(() => {
    if (existingParking) {
      fetchCategories();
    }
  }, []);

  const fetchCategories = async () => {
    setIsFetching(true);
    try {
      const data = await categoryApi.getCategories(existingParking.id_parking);
      // Transform categories to include their absolute price for the UI
      const enriched = data.map((cat: any) => ({
        ...cat,
        absolute_price: (existingParking.base_hourly_rate * cat.price_multiplier).toFixed(0)
      }));
      setCategories(enriched);
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setIsFetching(false);
    }
  };

  const handleAddLocalCategory = () => {
    if (!newCatName || !newCatCapacity || !newCatPrice) {
      CustomAlert.alert('Error', 'Por favor completa todos los campos del tipo de lugar');
      return;
    }

    const price = parseFloat(newCatPrice);
    const capacity = parseInt(newCatCapacity);

    if (isNaN(price) || price <= 0) {
      CustomAlert.alert('Error', 'El precio debe ser un número válido');
      return;
    }
    if (isNaN(capacity) || capacity <= 0) {
      CustomAlert.alert('Error', 'La capacidad debe ser un número válido');
      return;
    }

    const newCat = {
      name: newCatName,
      max_capacity: capacity,
      absolute_price: price,
      is_new: true // flag to know we need to save it to backend later
    };

    setCategories([...categories, newCat]);
    setNewCatName('');
    setNewCatCapacity('');
    setNewCatPrice('');
    setIsAddingCategory(false);
  };

  const removeCategory = async (index: number, id_category?: number) => {
    if (id_category && existingParking) {
      // If it's an existing category on an existing parking, delete from DB
      CustomAlert.alert('Eliminar', '¿Estás seguro de eliminar este tipo de lugar?', [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Eliminar', 
          style: 'destructive',
          onPress: async () => {
            try {
              await categoryApi.deleteCategory(existingParking.id_parking, id_category);
              setCategories(categories.filter((_, i) => i !== index));
            } catch (error) {
              CustomAlert.alert('Error', 'No se pudo eliminar de la base de datos');
            }
          }
        }
      ]);
    } else {
      // Just remove from local state
      setCategories(categories.filter((_, i) => i !== index));
    }
  };

  const handleGlobalSave = async () => {
    if (!name.trim()) {
      CustomAlert.alert('Error', 'Ingresa el nombre de la cochera');
      return;
    }
    if (categories.length === 0) {
      CustomAlert.alert('Error', 'Debes agregar al menos un tipo de lugar (ej: Autos)');
      return;
    }
    if (!location) {
      CustomAlert.alert('Ubicación requerida', 'Por favor fija la ubicación de tu cochera en el mapa');
      return;
    }

    setIsLoading(true);
    try {
      // 1. Determine Base Rate (we use the first category's price as base)
      const baseRate = categories[0].absolute_price;
      let parkingId = existingParking?.id_parking;

      const payload = {
        name: name.trim(), 
        base_hourly_rate: parseFloat(baseRate),
        latitude: location.latitude,
        longitude: location.longitude,
        address: "Ubicación fijada" // Puedes cambiar esto a geocoding inverso después
      };

      if (existingParking) {
        // Update existing
        await parkingApi.updateParking(parkingId, payload);
      } else {
        // Create new
        const newParking = await parkingApi.createParking(payload);
        parkingId = newParking.id_parking;
      }

      // 2. Save only NEW categories to the backend
      for (const cat of categories) {
        if (cat.is_new) {
          const multiplier = cat.absolute_price / baseRate;
          await categoryApi.createCategory(parkingId, {
            name: cat.name,
            max_capacity: cat.max_capacity,
            price_multiplier: multiplier
          });
        }
      }

      if (Platform.OS === 'web') {
        window.alert('Cochera guardada correctamente');
        navigation.goBack();
      } else {
        CustomAlert.alert('Éxito', 'Cochera guardada correctamente', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      }
    } catch (error: any) {
      CustomAlert.alert('Error', error.message || 'Error al guardar la configuración');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>{existingParking ? 'Editar Cochera' : 'Nueva Cochera'}</Text>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Nombre y Ubicación</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="business-outline" size={20} color={theme.colors.primary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Nombre de la cochera..."
                placeholderTextColor="rgba(255,255,255,0.3)"
                value={name}
                onChangeText={setName}
              />
            </View>
            {location ? (
              <TouchableOpacity 
                style={styles.locationCardActive}
                onPress={() => navigation.navigate('OwnerParkingMap', { 
                  onLocationSelect: (coords: any) => setLocation(coords),
                  latitude: location?.latitude,
                  longitude: location?.longitude,
                  address: location?.address || existingParking?.address,
                  id_parking: existingParking?.id_parking
                })}
              >
                <View style={styles.locationCardLeft}>
                  <View style={styles.locationIconOuter}>
                    <Ionicons name="location" size={20} color="#00f2fe" />
                  </View>
                  <View style={styles.locationTextWrapper}>
                    <Text style={styles.locationCardTitle}>Ubicación Establecida</Text>
                    <Text style={styles.locationCardSub} numberOfLines={1} ellipsizeMode="tail">
                      {location.address || existingParking?.address || `Lat: ${location.latitude.toFixed(4)} • Lon: ${location.longitude.toFixed(4)}`}
                    </Text>
                  </View>
                </View>
                <View style={styles.locationCardRight}>
                  <Text style={styles.locationEditBtnText}>Editar</Text>
                  <Ionicons name="chevron-forward" size={16} color="#00f2fe" />
                </View>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity 
                style={styles.locationCardInactive}
                onPress={() => navigation.navigate('OwnerParkingMap', { 
                  onLocationSelect: (coords: any) => setLocation(coords),
                  latitude: location?.latitude,
                  longitude: location?.longitude,
                  address: location?.address || existingParking?.address,
                  id_parking: existingParking?.id_parking
                })}
              >
                <View style={styles.locationCardLeft}>
                  <View style={styles.locationIconOuterInactive}>
                    <Ionicons name="map-outline" size={20} color="#ff9f43" />
                  </View>
                  <View style={styles.locationTextWrapper}>
                    <Text style={styles.locationCardTitleInactive}>Establecer Ubicación</Text>
                    <Text style={styles.locationCardSubInactive}>Requerido para poder guardar la cochera</Text>
                  </View>
                </View>
                <View style={styles.locationCardRight}>
                  <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.3)" />
                </View>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.section}>
            <View style={styles.rowBetween}>
              <Text style={styles.sectionTitle}>Tipos de Lugares y Precios</Text>
              {!isAddingCategory && (
                <TouchableOpacity onPress={() => setIsAddingCategory(true)}>
                  <Text style={styles.addText}>+ Agregar</Text>
                </TouchableOpacity>
              )}
            </View>
            
            {isFetching ? (
              <View style={styles.fetchingContainer}>
                <ActivityIndicator color={theme.colors.primary} size="small" />
                <Text style={styles.fetchingText}>Cargando categorías...</Text>
              </View>
            ) : categories.length === 0 && !isAddingCategory ? (
              <TouchableOpacity style={styles.emptyState} onPress={() => setIsAddingCategory(true)}>
                <Ionicons name="add-circle-outline" size={40} color="rgba(255,255,255,0.1)" />
                <Text style={styles.emptyText}>No has agregado tipos de lugares aún</Text>
                <Text style={styles.emptySub}>Toca para agregar (Ej: Autos, Motos...)</Text>
              </TouchableOpacity>
            ) : (
              categories.map((cat, index) => (
                <View key={index} style={styles.categoryCard}>
                  <View style={styles.catLeft}>
                    <View style={styles.iconCircle}>
                      <Ionicons 
                        name={cat.name.toLowerCase().includes('moto') ? 'bicycle' : 'car'} 
                        size={20} 
                        color={theme.colors.primary} 
                      />
                    </View>
                    <View>
                      <Text style={styles.catName}>{cat.name}</Text>
                      <Text style={styles.catStats}>{cat.max_capacity} lugares disponibles</Text>
                    </View>
                  </View>
                  <View style={styles.catRight}>
                    <Text style={styles.catPrice}>${cat.absolute_price}/h</Text>
                    <TouchableOpacity onPress={() => removeCategory(index, cat.id_category)} style={styles.deleteBtn}>
                      <Ionicons name="close-circle" size={20} color="rgba(255,255,255,0.2)" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}

            {isAddingCategory && (
              <View style={styles.addCard}>
                <Text style={styles.addTitle}>Nuevo Tipo</Text>
                
                <View style={styles.miniInputGroup}>
                  <Text style={styles.miniLabel}>¿Qué vehículo estaciona?</Text>
                  <TextInput
                    style={styles.miniInput}
                    placeholder="Ej: Auto, Moto, Camioneta..."
                    placeholderTextColor="rgba(255,255,255,0.2)"
                    value={newCatName}
                    onChangeText={setNewCatName}
                  />
                </View>

                <View style={styles.row}>
                  <View style={[styles.miniInputGroup, { flex: 1 }]}>
                    <Text style={styles.miniLabel}>Cant. Lugares</Text>
                    <TextInput
                      style={styles.miniInput}
                      placeholder="0"
                      placeholderTextColor="rgba(255,255,255,0.2)"
                      value={newCatCapacity}
                      onChangeText={setNewCatCapacity}
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={[styles.miniInputGroup, { flex: 1 }]}>
                    <Text style={styles.miniLabel}>Precio por hora</Text>
                    <View style={styles.currencyInputWrapper}>
                      <Text style={styles.currencySign}>$</Text>
                      <TextInput
                        style={[styles.miniInput, { paddingLeft: 20 }]}
                        placeholder="0"
                        placeholderTextColor="rgba(255,255,255,0.2)"
                        value={newCatPrice}
                        onChangeText={setNewCatPrice}
                        keyboardType="numeric"
                      />
                    </View>
                  </View>
                </View>

                <View style={styles.row}>
                  <TouchableOpacity 
                    style={[styles.actionBtn, styles.cancelBtn]} 
                    onPress={() => setIsAddingCategory(false)}
                  >
                    <Text style={styles.cancelBtnText}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.actionBtn, styles.confirmBtn]} 
                    onPress={handleAddLocalCategory}
                  >
                    <Text style={styles.confirmBtnText}>Agregar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>

        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity 
            style={[styles.saveButton, (isLoading || categories.length === 0 || !location) && styles.disabledButton]} 
            onPress={handleGlobalSave}
            disabled={isLoading || categories.length === 0 || !location}
          >
            <LinearGradient
              colors={[theme.colors.primary, '#24C6A5']}
              style={styles.gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {isLoading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.saveButtonText}>Guardar Cochera</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.l,
    gap: theme.spacing.m,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: theme.typography.sizes.h2,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.text,
  },
  scrollContent: {
    padding: theme.spacing.l,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 12,
    marginLeft: 5,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  addText: {
    color: theme.colors.primary,
    fontWeight: 'bold',
    fontSize: 14,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: 18,
    paddingHorizontal: 15,
    height: 60,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  categoryCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 20,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  catLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(36, 198, 165, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  catName: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  catStats: {
    color: theme.colors.textSecondary,
    fontSize: 12,
  },
  catRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  catPrice: {
    color: theme.colors.primary,
    fontSize: 18,
    fontWeight: 'bold',
  },
  deleteBtn: {
    padding: 5,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    borderStyle: 'dashed',
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.01)',
  },
  emptyText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 10,
  },
  emptySub: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    marginTop: 5,
  },
  addCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: theme.colors.primary + '30',
    gap: 15,
  },
  addTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  miniInputGroup: {
    gap: 8,
  },
  miniLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  miniInput: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 14,
    padding: 12,
    color: 'white',
    fontSize: 15,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  currencyInputWrapper: {
    position: 'relative',
  },
  currencySign: {
    position: 'absolute',
    left: 12,
    top: 13,
    color: theme.colors.primary,
    fontSize: 15,
    fontWeight: 'bold',
    zIndex: 1,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    height: 50,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtn: {
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  confirmBtn: {
    backgroundColor: theme.colors.primary,
  },
  cancelBtnText: {
    color: 'white',
    fontWeight: '600',
  },
  confirmBtnText: {
    color: theme.colors.background,
    fontWeight: 'bold',
  },
  footer: {
    padding: theme.spacing.l,
    backgroundColor: theme.colors.background,
  },
  saveButton: {
    height: 60,
    borderRadius: 20,
    overflow: 'hidden',
  },
  disabledButton: {
    opacity: 0.5,
  },
  gradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButtonText: {
    color: theme.colors.background,
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  fetchingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 20,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  fetchingText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  locationCardActive: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0, 242, 254, 0.04)',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 242, 254, 0.25)',
    marginTop: 10,
    shadowColor: '#00f2fe',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  locationCardInactive: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.01)',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: 'rgba(255, 159, 67, 0.3)',
    marginTop: 10,
  },
  locationCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginRight: 10,
  },
  locationIconOuter: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: 'rgba(0, 242, 254, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 242, 254, 0.2)',
  },
  locationIconOuterInactive: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 159, 67, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 159, 67, 0.15)',
  },
  locationTextWrapper: {
    justifyContent: 'center',
    flex: 1,
  },
  locationCardTitle: {
    color: '#00f2fe',
    fontSize: 15,
    fontWeight: 'bold',
    letterSpacing: 0.2,
  },
  locationCardTitleInactive: {
    color: '#ff9f43',
    fontSize: 15,
    fontWeight: 'bold',
    letterSpacing: 0.2,
  },
  locationCardSub: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    marginTop: 2,
    fontWeight: '600',
  },
  locationCardSubInactive: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    marginTop: 2,
  },
  locationCardRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationEditBtnText: {
    color: '#00f2fe',
    fontSize: 13,
    fontWeight: 'bold',
  },
});
