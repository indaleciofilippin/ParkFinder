import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, ActivityIndicator, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../../theme/theme';
import { parkingApi } from '../../services/api';
import { i18n } from '../../i18n';
import { formatCurrency } from '../../utils/formatters';

const { width, height } = Dimensions.get('window');

// Coordenadas por defecto (Centro de Buenos Aires)
const DEFAULT_REGION = {
  latitude: -34.6037,
  longitude: -58.3816,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

export const MapSearchScreen = ({ navigation, route }: any) => {
  const [parkings, setParkings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedParking, setSelectedParking] = useState<any>(null);
  
  // Si venimos de ver una cochera específica, centramos ahí
  const targetLat = route.params?.targetLat ? parseFloat(route.params.targetLat) : null;
  const targetLng = route.params?.targetLng ? parseFloat(route.params.targetLng) : null;

  const [region, setRegion] = useState(
    targetLat && targetLng 
    ? { latitude: targetLat, longitude: targetLng, latitudeDelta: 0.01, longitudeDelta: 0.01 }
    : DEFAULT_REGION
  );
  
  const [userLocation, setUserLocation] = useState<any>(null);

  useEffect(() => {
    fetchLocationAndParkings();
  }, []);

  const fetchLocationAndParkings = async () => {
    try {
      // 1. Obtener ubicación del usuario
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        let location = await Location.getCurrentPositionAsync({});
        const userReg = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        };
        setUserLocation(userReg);
        if (!targetLat && !targetLng) {
          setRegion(userReg);
        }
      }

      // 2. Obtener cocheras
      const data = await parkingApi.getParkings();
      // Filtrar las que tienen coordenadas válidas
      const validParkings = data.filter((p: any) => p.latitude && p.longitude);
      setParkings(validParkings);

      // Si venimos buscando una específica, la seleccionamos de una vez
      if (targetLat && targetLng) {
        const found = validParkings.find(
          (p: any) => Math.abs(parseFloat(p.latitude) - targetLat) < 0.0001 &&
                      Math.abs(parseFloat(p.longitude) - targetLng) < 0.0001
        );
        if (found) {
          setSelectedParking(found);
          // Panning con offset hacia el sur para no tapar el pin con la tarjeta flotante
          setRegion({
            latitude: targetLat - 0.003,
            longitude: targetLng,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01
          });
        }
      }

    } catch (error) {
      console.error('Error fetching data:', error);
      Alert.alert('Error', 'No se pudieron cargar las cocheras en el mapa.');
    } finally {
      setLoading(false);
    }
  };

  const centerOnUser = () => {
    if (userLocation) {
      setRegion(userLocation);
      setSelectedParking(null);
    } else {
      Alert.alert('Ubicación no disponible', 'Por favor habilita los permisos de ubicación.');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  // Encontrar el precio mínimo para el "Desde" en la tarjeta flotante
  const getMinPrice = (item: any) => {
    const baseRate = Number(item.base_hourly_rate || item.base_rate || 0);
    return item.categories && item.categories.length > 0
      ? Math.min(...item.categories.map((c: any) => baseRate * (c.price_multiplier || 1)))
      : baseRate;
  };

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        provider={PROVIDER_DEFAULT}
        region={region}
        showsUserLocation={true}
        showsMyLocationButton={false}
        mapPadding={{ top: Platform.OS === 'web' ? 80 : 0, right: 0, bottom: 0, left: 0 }}
        onPress={() => setSelectedParking(null)}
      >
        {parkings.map((parking) => (
          <Marker
            key={parking.id_parking}
            coordinate={{
              latitude: parseFloat(parking.latitude),
              longitude: parseFloat(parking.longitude)
            }}
            onPress={(e) => {
              e.stopPropagation();
              setSelectedParking(parking);
              setRegion({
                latitude: parseFloat(parking.latitude) - 0.003,
                longitude: parseFloat(parking.longitude),
                latitudeDelta: 0.01,
                longitudeDelta: 0.01
              });
            }}
          >
            <View style={[
              styles.customMarker,
              selectedParking?.id_parking === parking.id_parking && styles.customMarkerSelected
            ]}>
              <Ionicons 
                name="business" 
                size={18} 
                color={selectedParking?.id_parking === parking.id_parking ? "#000" : theme.colors.primary} 
              />
            </View>
          </Marker>
        ))}
      </MapView>

      <SafeAreaView style={styles.headerArea}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
      </SafeAreaView>

      <TouchableOpacity 
        style={[
          styles.locationButton, 
          selectedParking ? { bottom: Platform.OS === 'ios' ? 360 : 340 } : { bottom: Platform.OS === 'ios' ? 40 : 20 }
        ]} 
        onPress={centerOnUser}
      >
        <Ionicons name="locate" size={24} color={theme.colors.text} />
      </TouchableOpacity>

      {/* Floating Glassmorphic Parking Details Card */}
      {selectedParking && (
        <View style={styles.floatingCardContainer}>
          <View style={styles.blurCard}>
            {/* Header info */}
            <View style={styles.cardHeader}>
              <View style={styles.parkingIconContainer}>
                <Ionicons name="business" size={24} color={theme.colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.nameRow}>
                  <Text style={styles.parkingName} numberOfLines={1}>
                    {selectedParking.name || 'Cochera'}
                  </Text>
                  <Text style={styles.rateText}>
                    Desde {formatCurrency(Math.round(getMinPrice(selectedParking)))}/h
                  </Text>
                </View>
                <View style={styles.statusBadge}>
                  <View style={[
                    styles.statusDot, 
                    { backgroundColor: selectedParking.total_available > 0 ? theme.colors.success : theme.colors.error }
                  ]} />
                  <Text style={[
                    styles.statusText, 
                    { color: selectedParking.total_available > 0 ? theme.colors.success : theme.colors.error }
                  ]}>
                    {selectedParking.total_available > 0 ? 'Disponible' : 'Completo'}
                  </Text>
                  {selectedParking.address && (
                    <Text style={styles.addressText} numberOfLines={1}>
                      • {selectedParking.address}
                    </Text>
                  )}
                </View>
              </View>
              <TouchableOpacity 
                style={styles.closeCardButton} 
                onPress={() => setSelectedParking(null)}
              >
                <Ionicons name="close" size={20} color="rgba(255,255,255,0.4)" />
              </TouchableOpacity>
            </View>

            {/* Stats Grid */}
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{selectedParking.total_available}</Text>
                <Text style={styles.statLabel}>LIBRES</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: '#FFD700' }]}>
                  {selectedParking.total_occupied}
                </Text>
                <Text style={styles.statLabel}>RESERVADOS</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{selectedParking.total_capacity}</Text>
                <Text style={styles.statLabel}>TOTALES</Text>
              </View>
            </View>

            {/* Categories Row */}
            <View style={styles.categoriesRow}>
              {selectedParking.categories?.slice(0, 3).map((cat: any) => {
                const baseRate = Number(selectedParking.base_hourly_rate || selectedParking.base_rate || 0);
                const catPrice = Math.round(baseRate * (cat.price_multiplier || 1));
                const isCatAvailable = cat.available > 0;
                return (
                  <View key={cat.id_category} style={[styles.miniCat, !isCatAvailable && { opacity: 0.5 }]}>
                    <Ionicons 
                      name={cat.name.toLowerCase().includes('moto') ? 'bicycle' : 'car'} 
                      size={12} 
                      color={isCatAvailable ? theme.colors.primary : "rgba(255,255,255,0.4)"} 
                    />
                    <Text style={styles.miniCatText}>
                      {cat.name.toLowerCase()}: <Text style={{ color: 'white', fontWeight: 'bold' }}>{formatCurrency(catPrice)}</Text>
                    </Text>
                  </View>
                );
              })}
            </View>

            {/* Book Now Button */}
            <TouchableOpacity 
              style={styles.bookButton}
              onPress={() => navigation.navigate('CreateBooking', { parking: selectedParking })}
            >
              <LinearGradient
                colors={[theme.colors.primary, '#24C6A5']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.bookGradient}
              >
                <Text style={styles.bookButtonText}>Reservar Lugar</Text>
                <Ionicons name="chevron-forward" size={18} color={theme.colors.background} />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  map: {
    width: width,
    height: height,
  },
  headerArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    padding: 20,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  customMarker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.colors.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  customMarkerSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: 'white',
    transform: [{ scale: 1.25 }],
  },
  locationButton: {
    position: 'absolute',
    right: 20,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  floatingCardContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 40 : 20,
    left: 20,
    right: 20,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 10,
  },
  blurCard: {
    padding: 20,
    backgroundColor: 'rgba(10, 15, 36, 0.96)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 24,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  parkingIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(36, 198, 165, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  parkingName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    flex: 1,
    marginRight: 8,
  },
  rateText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  addressText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
    marginLeft: 4,
    flex: 1,
  },
  closeCardButton: {
    padding: 5,
    marginLeft: 5,
  },
  statsGrid: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  statLabel: {
    fontSize: 8,
    fontWeight: '800',
    color: theme.colors.textSecondary,
    marginTop: 2,
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    height: 25,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  categoriesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 15,
  },
  miniCat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  miniCatText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 11,
  },
  bookButton: {
    height: 50,
    borderRadius: 15,
    overflow: 'hidden',
  },
  bookGradient: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  bookButtonText: {
    color: theme.colors.background,
    fontSize: 16,
    fontWeight: 'bold',
  }
});
