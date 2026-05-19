import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, SafeAreaView, Alert } from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme/theme';

const { width, height } = Dimensions.get('window');

const DEFAULT_REGION = {
  latitude: -34.6037,
  longitude: -58.3816,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

export const OwnerParkingMapScreen = ({ navigation, route }: any) => {
  // Recibimos coordenadas iniciales si estamos editando
  const initialLat = route.params?.latitude ? parseFloat(route.params.latitude) : null;
  const initialLng = route.params?.longitude ? parseFloat(route.params.longitude) : null;

  const [region, setRegion] = useState(
    initialLat && initialLng 
    ? { ...DEFAULT_REGION, latitude: initialLat, longitude: initialLng } 
    : DEFAULT_REGION
  );
  
  const [selectedCoordinate, setSelectedCoordinate] = useState<any>(
    initialLat && initialLng ? { latitude: initialLat, longitude: initialLng } : null
  );

  useEffect(() => {
    if (!initialLat || !initialLng) {
      getCurrentLocation();
    }
  }, []);

  const getCurrentLocation = async () => {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status === 'granted') {
      let location = await Location.getCurrentPositionAsync({});
      setRegion({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    }
  };

  const handleMapPress = (e: any) => {
    setSelectedCoordinate(e.nativeEvent.coordinate);
  };

  const handleConfirm = () => {
    if (!selectedCoordinate) {
      Alert.alert('Atención', 'Por favor toca el mapa para seleccionar la ubicación de tu cochera.');
      return;
    }
    // Devolvemos las coordenadas a la pantalla anterior
    if (route.params?.onLocationSelect) {
      route.params.onLocationSelect(selectedCoordinate);
    }
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        provider={PROVIDER_DEFAULT}
        region={region}
        onPress={handleMapPress}
        showsUserLocation={true}
      >
        {selectedCoordinate && (
          <Marker
            coordinate={selectedCoordinate}
            pinColor={theme.colors.secondary}
          />
        )}
      </MapView>

      <SafeAreaView style={styles.headerArea}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <View style={styles.instructionBox}>
          <Text style={styles.instructionText}>Toca el mapa para fijar la ubicación</Text>
        </View>
      </SafeAreaView>

      <SafeAreaView style={styles.footerArea}>
        <TouchableOpacity 
          style={[styles.confirmButton, !selectedCoordinate && { opacity: 0.5 }]} 
          onPress={handleConfirm}
          disabled={!selectedCoordinate}
        >
          <Text style={styles.confirmText}>Confirmar Ubicación</Text>
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  instructionBox: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 2,
  },
  instructionText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  footerArea: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingBottom: 40,
    backgroundColor: 'rgba(10, 15, 36, 0.8)',
  },
  confirmButton: {
    backgroundColor: theme.colors.primary,
    height: 56,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmText: {
    color: '#000',
    fontSize: 18,
    fontWeight: 'bold',
  }
});
