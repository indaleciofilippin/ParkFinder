import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Dimensions, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../../theme/theme';
import { vehicleApi, bookingApi } from '../../services/api';
import { i18n } from '../../i18n';
import DateTimePicker from '@react-native-community/datetimepicker';
import { formatCurrency } from '../../utils/formatters';

const { width } = Dimensions.get('window');

export const CreateBookingScreen = ({ navigation, route }: any) => {
  const { parking } = route.params;
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Arrival Time state (The only one that matters for the user)
  const [arrivalTime, setArrivalTime] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);

  const onTimeChange = (event: any, selectedDate?: Date) => {
    setShowPicker(Platform.OS === 'ios');
    if (selectedDate) {
      setArrivalTime(selectedDate);
    }
  };

  useEffect(() => {
    fetchVehicles();
    if (parking.categories && parking.categories.length > 0) {
      setSelectedCategory(parking.categories[0]);
    }
  }, [parking.categories]);

  const fetchVehicles = async () => {
    try {
      const data = await vehicleApi.getVehicles();
      setVehicles(data);
      if (data.length > 0) {
        setSelectedVehicle(data[0].id_vehicle);
      }
    } catch (error) {
      console.error('Error fetching vehicles:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateBooking = async () => {
    if (!selectedVehicle || !selectedCategory) {
      Alert.alert('Error', 'Por favor selecciona un vehículo y categoría');
      return;
    }

    setIsSubmitting(true);
    try {
      // For now, we send +2h as default end time for availability purposes,
      // but it will be open based on actual camera entry/exit in the future.
      const defaultDuration = 2; // 2 hours buffer
      const departureTime = new Date(arrivalTime.getTime() + defaultDuration * 60 * 60 * 1000);

      await bookingApi.createBooking({
        id_vehicle: selectedVehicle,
        id_parking: parking.id_parking,
        id_category: selectedCategory.id_category,
        expected_start_time: arrivalTime.toISOString(),
        expected_end_time: departureTime.toISOString(),
      });

      Alert.alert(
        'Reserva Confirmada',
        'Tu lugar está reservado. La barrera se abrirá automáticamente al detectar tu patente.',
        [{ text: 'Listo', onPress: () => navigation.navigate('Home') }]
      );
    } catch (error: any) {
      const errorMsg = error.response?.data?.detail || error.message || 'No se pudo realizar la reserva';
      Alert.alert('Error', errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const setTimeQuickly = (minutesToAdd: number) => {
    const now = new Date();
    setArrivalTime(new Date(now.getTime() + minutesToAdd * 60000));
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  // Safe rates with multiple fallbacks
  const baseRate = Number(parking.base_hourly_rate || parking.base_rate || 0);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.title}>Confirmar Reserva</Text>
          <Text style={styles.subtitle}>{parking.name}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Summary Card - Professional & Clear */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <View style={styles.summaryIconContainer}>
              <Ionicons name="business" size={24} color={theme.colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.summaryName}>{parking.name || 'Cochera Seleccionada'}</Text>
              <Text style={styles.summaryAddress}>{parking.total_available} lugares libres ahora</Text>
            </View>
          </View>
          
          <View style={styles.summaryDivider} />
          
          <View style={styles.policyRow}>
            <View style={styles.policyItem}>
              <Ionicons name="time-outline" size={16} color={theme.colors.textSecondary} />
              <Text style={styles.policyText}>Llegada: {formatTime(arrivalTime)}</Text>
            </View>
            {new Date(arrivalTime.getTime() - 30 * 60000) > new Date() && (
              <View style={styles.policyItem}>
                <Ionicons name="shield-checkmark-outline" size={16} color="#24C6A5" />
                <Text style={styles.policyText}>Cancela gratis hasta: {formatTime(new Date(arrivalTime.getTime() - 30 * 60000))}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Arrival Section */}
        <Text style={styles.sectionHeader}>¿Cuándo llegas?</Text>
        <View style={styles.glassSection}>
          <TouchableOpacity style={styles.timeBox} onPress={() => setShowPicker(true)}>
            <Text style={styles.timeValue}>{formatTime(arrivalTime)}</Text>
            <Text style={styles.graceText}>* Tienes 10 min de cortesía después de esta hora.</Text>
            <View style={styles.editBadge}>
              <Ionicons name="pencil" size={10} color={theme.colors.primary} />
              <Text style={styles.editBadgeText}>Toca para cambiar</Text>
            </View>
          </TouchableOpacity>

          {showPicker && (
            <DateTimePicker
              value={arrivalTime}
              mode="time"
              is24Hour={true}
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={onTimeChange}
              textColor="white"
            />
          )}

          <View style={styles.quickOptions}>
            <View style={styles.optionRow}>
              {[0, 15, 30, 45].map((m) => (
                <TouchableOpacity 
                  key={m} 
                  style={[
                    styles.miniOption, 
                    Math.abs(arrivalTime.getTime() - (new Date().getTime() + m * 60000)) < 120000 && styles.activeMiniOption
                  ]}
                  onPress={() => setTimeQuickly(m)}
                >
                  <Text style={[styles.optionText, Math.abs(arrivalTime.getTime() - (new Date().getTime() + m * 60000)) < 120000 && { color: theme.colors.primary, fontWeight: '800' }]}>
                    {m === 0 ? 'Ahora' : `+${m}m`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Vehicle Selection */}
        <Text style={styles.sectionHeader}>Vehículo</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.vehicleScroll} contentContainerStyle={{ paddingRight: 40 }}>
          {vehicles.map((v) => (
            <TouchableOpacity 
              key={v.id_vehicle}
              style={[styles.vehicleCard, selectedVehicle === v.id_vehicle && styles.selectedVehicle]}
              onPress={() => setSelectedVehicle(v.id_vehicle)}
            >
              <View style={[styles.vIconContainer, selectedVehicle === v.id_vehicle && { backgroundColor: 'rgba(36, 198, 165, 0.2)' }]}>
                <Ionicons name="car" size={24} color={selectedVehicle === v.id_vehicle ? theme.colors.primary : 'rgba(255,255,255,0.4)'} />
              </View>
              <Text style={styles.vPlate}>{v.license_plate}</Text>
              <Text style={styles.vModel} numberOfLines={1}>{v.model}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Category Selection */}
        <Text style={styles.sectionHeader}>Tipo de lugar</Text>
        <View style={styles.categoriesGrid}>
          {parking.categories?.map((cat: any) => (
            <TouchableOpacity 
              key={cat.id_category}
              style={[styles.catCard, selectedCategory?.id_category === cat.id_category && styles.selectedCat]}
              onPress={() => setSelectedCategory(cat)}
            >
              <View style={styles.catHeader}>
                <Ionicons 
                  name={cat.name.toLowerCase().includes('moto') ? 'bicycle' : 'car'} 
                  size={20} 
                  color={selectedCategory?.id_category === cat.id_category ? 'white' : theme.colors.textSecondary} 
                />
                <Text style={[styles.catPrice, selectedCategory?.id_category === cat.id_category && { color: 'white' }]}>
                  {formatCurrency(Math.round(baseRate * Number(cat.price_multiplier || 1)))}/h
                </Text>
              </View>
              <Text style={[styles.catName, selectedCategory?.id_category === cat.id_category && { color: 'white' }]}>{cat.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Policy Alert Box */}
        <View style={styles.warningBox}>
          <View style={styles.warningHeader}>
            <Ionicons name="alert-circle" size={20} color="#FFD700" />
            <Text style={styles.warningTitle}>IMPORTANTE</Text>
          </View>
          <Text style={styles.warningText}>
            • La barrera se abrirá por lectura de patente.{"\n"}
            • Si llegas más de 10 min tarde, la reserva caduca.{"\n"}
            • Cancelación sin cargo hasta 30 min antes de la llegada.
          </Text>
        </View>

      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity 
          style={[styles.confirmButton, isSubmitting && { opacity: 0.7 }]}
          onPress={handleCreateBooking}
          disabled={isSubmitting}
        >
          <LinearGradient
            colors={[theme.colors.primary, '#24C6A5']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.gradient}
          >
            {isSubmitting ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <Text style={styles.confirmText}>Confirmar y Reservar</Text>
                <Ionicons name="chevron-forward" size={20} color={theme.colors.background} />
              </>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    gap: 15,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  summaryCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginBottom: 25,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  summaryIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(36, 198, 165, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  summaryName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  summaryAddress: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginVertical: 15,
  },
  policyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  policyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  policyText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '500',
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 15,
    marginLeft: 5,
  },
  glassSection: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginBottom: 25,
  },
  timeBox: {
    alignItems: 'center',
    marginBottom: 20,
  },
  timeValue: {
    fontSize: 48,
    fontWeight: '800',
    color: theme.colors.primary,
  },
  graceText: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 5,
    fontStyle: 'italic',
  },
  editBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  editBadgeText: {
    fontSize: 10,
    color: theme.colors.primary,
    fontWeight: 'bold',
  },
  quickOptions: {
    marginBottom: 5,
  },
  optionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  miniOption: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  activeMiniOption: {
    backgroundColor: 'rgba(36, 198, 165, 0.1)',
    borderColor: theme.colors.primary,
  },
  optionText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  vehicleScroll: {
    marginBottom: 25,
  },
  vehicleCard: {
    width: 125,
    padding: 15,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 20,
    marginRight: 15,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
  },
  vIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  selectedVehicle: {
    borderColor: theme.colors.primary,
    backgroundColor: 'rgba(36, 198, 165, 0.05)',
  },
  vPlate: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  vModel: {
    color: theme.colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  categoriesGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 25,
  },
  catCard: {
    flex: 1,
    padding: 15,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  selectedCat: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  catHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  catPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  catName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: 'white',
  },
  warningBox: {
    backgroundColor: 'rgba(255, 215, 0, 0.05)',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
    marginBottom: 20,
  },
  warningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  warningTitle: {
    color: '#FFD700',
    fontWeight: '900',
    fontSize: 12,
    letterSpacing: 1,
  },
  warningText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    lineHeight: 18,
  },
  footer: {
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 30 : 20,
    backgroundColor: theme.colors.background,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  confirmButton: {
    borderRadius: 18,
    overflow: 'hidden',
    height: 56,
  },
  gradient: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  confirmText: {
    color: theme.colors.background,
    fontSize: 18,
    fontWeight: 'bold',
  },
});
