import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, ActivityIndicator, Alert, SafeAreaView } from 'react-native';
import MapView, { Marker, Callout, PROVIDER_DEFAULT } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme/theme';
import { parkingApi } from '../../services/api';
import { i18n } from '../../i18n';

const { width, height } = Dimensions.get('window');

// Coordenadas por defecto (Centro de Buenos Aires)
const DEFAULT_REGION = {
  latitude: -34.6037,
  longitude: -58.3816,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

export const MapSearchScreen = ({ navigation }: any) => {
  const [parkings, setParkings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [region, setRegion] = useState(DEFAULT_REGION);
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
        setRegion(userReg);
      }

      // 2. Obtener cocheras
      const data = await parkingApi.getParkings();
      // Filtrar las que tienen coordenadas válidas
      const validParkings = data.filter((p: any) => p.latitude && p.longitude);
      setParkings(validParkings);

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

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        provider={PROVIDER_DEFAULT}
        region={region}
        showsUserLocation={true}
        showsMyLocationButton={false}
      >
        {parkings.map((parking) => (
          <Marker
            key={parking.id_parking}
            coordinate={{
              latitude: parseFloat(parking.latitude),
              longitude: parseFloat(parking.longitude)
            }}
            pinColor={theme.colors.primary}
          >
            <Callout 
              tooltip 
              onPress={() => {
                // En la rama actual no existe CreateBookingScreen, así que mostramos alerta temporal
                Alert.alert('Cochera', `Has seleccionado ${parking.name}`);
              }}
            >
              <View style={styles.calloutContainer}>
                <Text style={styles.calloutTitle}>{parking.name}</Text>
                <Text style={styles.calloutPrice}>
                  ${parking.base_hourly_rate}/h
                </Text>
                <TouchableOpacity style={styles.calloutButton}>
                  <Text style={styles.calloutButtonText}>Ver Detalles</Text>
                </TouchableOpacity>
              </View>
            </Callout>
          </Marker>
        ))}
      </MapView>

      <SafeAreaView style={styles.headerArea}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
      </SafeAreaView>

      <TouchableOpacity style={styles.locationButton} onPress={centerOnUser}>
        <Ionicons name="locate" size={24} color={theme.colors.text} />
      </TouchableOpacity>
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
  locationButton: {
    position: 'absolute',
    bottom: 40,
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
  calloutContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 15,
    width: 200,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  calloutTitle: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  calloutPrice: {
    color: theme.colors.primary,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
  },
  calloutButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  calloutButtonText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 12,
  }
});
