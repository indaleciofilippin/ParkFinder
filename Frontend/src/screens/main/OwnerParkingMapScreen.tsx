import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, Alert, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../../theme/theme';
import { parkingApi } from '../../services/api';

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
  const activeIdParking = route.params?.id_parking;

  const [region, setRegion] = useState(
    initialLat && initialLng 
    ? { ...DEFAULT_REGION, latitude: initialLat, longitude: initialLng, latitudeDelta: 0.01, longitudeDelta: 0.01 } 
    : DEFAULT_REGION
  );
  
  const [selectedCoordinate, setSelectedCoordinate] = useState<any>(
    initialLat && initialLng ? { latitude: initialLat, longitude: initialLng, address: route.params?.address } : null
  );

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [existingParkings, setExistingParkings] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);

  useEffect(() => {
    fetchExistingParkings();
    if (!initialLat || !initialLng) {
      getCurrentLocation();
    }
  }, []);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchQuery.trim().length > 2 && searchQuery !== selectedCoordinate?.address) {
        fetchSuggestions(searchQuery);
      } else {
        setSuggestions([]);
      }
    }, 450); // 450ms debounce to prevent hitting rate limits

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const fetchSuggestions = async (query: string) => {
    console.log(`🔍 [Geocoding] Buscando sugerencias para: "${query}"`);
    try {
      const response = await fetch(
        `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=8&lat=${region.latitude}&lon=${region.longitude}`,
        {
          headers: {
            'User-Agent': 'ParkFinder-App/1.0.0 (contact: info@parkfinder.com)',
            'Accept': 'application/json'
          }
        }
      );
      const data = await response.json();
      if (data && data.features) {
        const mapped = data.features.map((feature: any) => {
          const { coordinates } = feature.geometry;
          const { properties } = feature;
          return {
            label: buildLabel(properties),
            latitude: coordinates[1],
            longitude: coordinates[0]
          };
        });
        // Filter out empty labels or duplicates
        const unique = mapped.filter((item: any, index: number, self: any[]) => 
          item.label && self.findIndex(t => t.label === item.label) === index
        );
        console.log(`✨ [Geocoding] ${unique.length} sugerencias encontradas`);
        setSuggestions(unique);
      }
    } catch (error) {
      console.error("❌ Error fetching geocoding suggestions:", error);
    }
  };

  const buildLabel = (properties: any) => {
    const parts = [];
    if (properties.name) parts.push(properties.name);
    if (properties.street && properties.street !== properties.name) parts.push(properties.street);
    if (properties.housenumber) parts.push(properties.housenumber);
    if (properties.city) parts.push(properties.city);
    if (properties.country) parts.push(properties.country);
    return parts.join(', ');
  };

  const handleSelectSuggestion = (item: any) => {
    const newCoords = { latitude: item.latitude, longitude: item.longitude, address: item.label };
    setSelectedCoordinate(newCoords);
    setRegion({
      ...region,
      latitude: item.latitude,
      longitude: item.longitude,
      latitudeDelta: 0.005,
      longitudeDelta: 0.005
    });
    setSearchQuery(item.label);
    setSuggestions([]);
  };

  const fetchExistingParkings = async () => {
    try {
      const data = await parkingApi.getParkings();
      // Filter out parkings that don't have valid coordinates
      const valid = data.filter((p: any) => p.latitude && p.longitude);
      setExistingParkings(valid);
    } catch (e) {
      console.error("Error fetching existing parkings:", e);
    }
  };

  const reverseGeocodeCoords = async (coords: { latitude: number; longitude: number }) => {
    try {
      const resp = await fetch(
        `https://photon.komoot.io/reverse?lon=${coords.longitude}&lat=${coords.latitude}`,
        {
          headers: {
            'User-Agent': 'ParkFinder-App/1.0.0 (contact: info@parkfinder.com)'
          }
        }
      );
      if (resp.ok) {
        const data = await resp.json();
        if (data.features && data.features.length > 0) {
          const feat = data.features[0];
          const parts = [];
          const props = feat.properties;
          if (props.street) parts.push(props.street);
          if (props.housenumber) parts.push(props.housenumber);
          if (props.city) parts.push(props.city);
          const addressText = parts.join(' ') || props.name || "Dirección Seleccionada";
          setSelectedCoordinate({ ...coords, address: addressText });
        }
      }
    } catch (err) {
      console.error("Reverse geocoding error:", err);
    }
  };

  const getCurrentLocation = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permiso Denegado',
          'Necesitamos acceso a tu ubicación para centrar el mapa y ubicar tu cochera de forma precisa.'
        );
        return;
      }
      
      // Try to get last known position first (super fast, never hangs!)
      const lastKnown = await Location.getLastKnownPositionAsync({});
      if (lastKnown) {
        const coords = { latitude: lastKnown.coords.latitude, longitude: lastKnown.coords.longitude };
        setRegion({
          ...coords,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        });
        setSelectedCoordinate(coords);
        reverseGeocodeCoords(coords);
      }
      
      // Then request current position with a fast timeout
      const location = await Promise.race([
        Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced
        }),
        new Promise<null>((_, reject) => setTimeout(() => reject(new Error("Timeout")), 3000))
      ]);

      if (location) {
        const coords = { latitude: location.coords.latitude, longitude: location.coords.longitude };
        setRegion({
          ...coords,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        });
        setSelectedCoordinate(coords);
        reverseGeocodeCoords(coords);
      }
    } catch (e: any) {
      console.warn("Non-blocking Location retrieval warning:", e.message);
    }
  };

  const handleMapPress = async (e: any) => {
    const coords = e.nativeEvent.coordinate;
    setSelectedCoordinate(coords);
    await reverseGeocodeCoords(coords);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const result = await Location.geocodeAsync(searchQuery);
      if (result && result.length > 0) {
        const { latitude, longitude } = result[0];
        const newRegion = { latitude, longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 };
        setRegion(newRegion);
        setSelectedCoordinate({ latitude, longitude, address: searchQuery.trim() });
        setSuggestions([]);
      } else {
        Alert.alert('No encontrado', 'No pudimos encontrar esa dirección. Intenta ser más específico (Ej: Calle 123, Ciudad).');
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Hubo un problema al buscar la dirección.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleConfirm = async () => {
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
        showsMyLocationButton={false}
        mapPadding={{ top: Platform.OS === 'web' ? 80 : 0, right: 0, bottom: 0, left: 0 }}
      >
        {/* Render all other parkings owned by this user as gray markers */}
        {existingParkings.map((p: any) => {
          if (activeIdParking && p.id_parking === activeIdParking) return null;
          return (
            <Marker
              key={p.id_parking}
              coordinate={{
                latitude: parseFloat(p.latitude),
                longitude: parseFloat(p.longitude)
              }}
              title={p.name}
              description="Tu cochera existente"
              pinColor="#7f8c8d"
            />
          );
        })}

        {/* Selected target parking coordinate marker */}
        {selectedCoordinate && (
          <Marker
            coordinate={selectedCoordinate}
          >
            <View style={styles.markerContainer}>
              <View style={styles.markerDot} />
              <View style={styles.markerHalo} />
            </View>
          </Marker>
        )}
      </MapView>

      <View style={styles.headerAreaFloating}>
        <View style={styles.unifiedHeaderRow}>
          <TouchableOpacity style={styles.backButtonRound} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={22} color="white" />
          </TouchableOpacity>

          <View style={styles.searchContainerCompact}>
            <Ionicons name="search" size={16} color={theme.colors.textSecondary} style={styles.searchIconCompact} />
            <TextInput
              style={styles.searchInputCompact}
              placeholder="Buscar calle y ciudad..."
              placeholderTextColor="rgba(255,255,255,0.4)"
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
            />
            {isSearching && <ActivityIndicator color={theme.colors.primary} size="small" style={{ marginRight: 10 }} />}
          </View>

          <TouchableOpacity style={styles.backButtonRound} onPress={getCurrentLocation}>
            <Ionicons name="locate" size={18} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Floating glass dropdown suggestions list - Top-level sibling for absolute rendering & zero parent bounds clipping */}
      {suggestions.length > 0 && (
        <View style={styles.suggestionsContainer}>
          {suggestions.map((item, idx) => (
            <TouchableOpacity
              key={idx}
              style={[styles.suggestionItem, idx < suggestions.length - 1 && styles.suggestionDivider]}
              onPress={() => handleSelectSuggestion(item)}
            >
              <Ionicons name="location-sharp" size={15} color={theme.colors.primary} style={{ marginRight: 8 }} />
              <Text style={styles.suggestionText} numberOfLines={1}>
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={styles.footerAreaFloating}
        pointerEvents="box-none"
      >
        <View style={styles.footerContentCompact}>
          <View style={styles.footerContentRow}>
            <View style={styles.footerTextContainerCompact}>
              <Text style={styles.footerTitleCompact}>
                {selectedCoordinate ? 'Ubicación seleccionada' : 'Fija la ubicación'}
              </Text>
              <Text style={styles.footerSubtitleCompact} numberOfLines={2}>
                {selectedCoordinate 
                  ? 'Ubicación lista. Toca confirmar.'
                  : 'Fija un marcador o usa el buscador superior.'}
              </Text>
            </View>
            
            <TouchableOpacity 
              style={[styles.confirmButtonCompact, !selectedCoordinate && styles.confirmButtonDisabled]} 
              onPress={handleConfirm}
              disabled={!selectedCoordinate}
            >
              <LinearGradient
                colors={selectedCoordinate ? [theme.colors.primary, '#00f2fe'] : ['#333', '#444']}
                style={styles.gradientCompact}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.confirmTextCompact}>Confirmar</Text>
                <Ionicons name="checkmark-circle" size={16} color={selectedCoordinate ? '#000' : 'rgba(255,255,255,0.3)'} />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
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
  markerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 50,
    height: 50,
  },
  markerDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: theme.colors.primary,
    borderWidth: 2.5,
    borderColor: 'white',
    zIndex: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  markerHalo: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 242, 254, 0.3)',
    zIndex: 1,
  },
  headerAreaFloating: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingTop: Platform.OS === 'ios' ? 50 : 35,
    zIndex: 10,
  },
  unifiedHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 8,
    width: '100%',
  },
  backButtonRound: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(10, 15, 36, 0.95)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  searchContainerCompact: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 21,
    height: 42,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(10, 15, 36, 0.95)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  searchIconCompact: {
    paddingHorizontal: 12,
  },
  searchInputCompact: {
    flex: 1,
    color: 'white',
    fontSize: 13,
    height: '100%',
  },
  footerAreaFloating: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 36 : 24,
    left: 16,
    right: 16,
    justifyContent: 'flex-end',
    zIndex: 10,
  },
  footerContentCompact: {
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(0, 242, 254, 0.22)',
    backgroundColor: 'rgba(10, 15, 36, 0.95)',
    overflow: 'hidden',
    shadowColor: '#00f2fe',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
    elevation: 15,
  },
  footerContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  footerTextContainerCompact: {
    flex: 1.2,
    gap: 2,
  },
  footerTitleCompact: {
    color: 'white',
    fontSize: 15,
    fontWeight: 'bold',
  },
  footerSubtitleCompact: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
    lineHeight: 14,
  },
  confirmButtonCompact: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    overflow: 'hidden',
    maxWidth: 140,
  },
  confirmButtonDisabled: {
    opacity: 0.5,
  },
  gradientCompact: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  confirmTextCompact: {
    color: '#000',
    fontSize: 13,
    fontWeight: 'bold',
  },
  suggestionsContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 105 : 90,
    left: 16,
    right: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 242, 254, 0.25)',
    backgroundColor: 'rgba(10, 15, 36, 0.98)',
    paddingVertical: 4,
    shadowColor: '#00f2fe',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 20,
    zIndex: 9999,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  suggestionDivider: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  suggestionText: {
    color: 'white',
    fontSize: 13,
    flex: 1,
  }
});
