import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../../theme/theme';
import { parkingApi } from '../../services/api';
import { formatCurrency } from '../../utils/formatters';
import { i18n } from '../../i18n';

export const FindParkingScreen = ({ navigation }: any) => {
  const [parkings, setParkings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchParkings = async () => {
    try {
      const data = await parkingApi.getAllParkingsAvailability();
      setParkings(data);
    } catch (error) {
      console.error('Error fetching parkings:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchParkings();
  }, []);

  const onRefresh = () => {
    setIsRefreshing(true);
    fetchParkings();
  };

  const renderParkingItem = ({ item }: { item: any }) => {
    const isAvailable = item.total_available > 0;
    const baseRate = item.base_hourly_rate || item.base_rate || 0;
    
    // Encontrar el precio mínimo para el "Desde"
    const minPrice = item.categories && item.categories.length > 0
      ? Math.min(...item.categories.map((c: any) => baseRate * (c.price_multiplier || 1)))
      : baseRate;

    return (
      <TouchableOpacity 
        style={styles.parkingCard}
        onPress={() => navigation.navigate('CreateBooking', { parking: item })}
      >
        <View style={styles.cardMain}>
          <View style={styles.cardHeader}>
            <View style={styles.parkingIconContainer}>
              <Ionicons name="business" size={20} color={theme.colors.primary} />
            </View>
            <View style={styles.headerInfo}>
              <View style={styles.nameRow}>
                <Text style={styles.parkingName} numberOfLines={1}>{item.name || item.parking_name || 'Cochera'}</Text>
                {item.latitude && item.longitude && (
                  <TouchableOpacity 
                    style={styles.mapIconButton}
                    onPress={() => navigation.navigate('MapSearch', { 
                      targetLat: item.latitude, 
                      targetLng: item.longitude 
                    })}
                  >
                    <Ionicons name="map-outline" size={18} color="#00f2fe" />
                  </TouchableOpacity>
                )}
                <Text style={styles.rateText}>Desde {formatCurrency(Math.round(minPrice))}/h</Text>
              </View>
              <View style={styles.statusBadge}>
                <View style={[styles.statusDot, { backgroundColor: isAvailable ? theme.colors.success : theme.colors.error }]} />
                <Text style={[styles.statusText, { color: isAvailable ? theme.colors.success : theme.colors.error }]}>
                  {isAvailable ? 'Disponible' : 'Completo'}
                </Text>
                {item.address && (
                  <Text style={styles.addressText} numberOfLines={1}>• {item.address}</Text>
                )}
              </View>
            </View>
          </View>

          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{item.total_available}</Text>
              <Text style={styles.statLabel}>LIBRES</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: '#FFD700' }]}>{item.total_occupied}</Text>
              <Text style={styles.statLabel}>RESERVADOS</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{item.total_capacity}</Text>
              <Text style={styles.statLabel}>TOTALES</Text>
            </View>
          </View>

          <View style={styles.categoriesRow}>
            {item.categories?.map((cat: any) => {
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
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>{i18n.t('bookings.find_parking')}</Text>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <FlatList
          data={parkings}
          keyExtractor={(item) => item.id_parking.toString()}
          renderItem={renderParkingItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="search-outline" size={64} color={theme.colors.textSecondary} />
              <Text style={styles.emptyText}>No hay cocheras disponibles en este momento</Text>
            </View>
          }
        />
      )}
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
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
    gap: 16,
  },
  parkingCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  cardMain: {
    padding: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
    marginBottom: 20,
  },
  parkingIconContainer: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: 'rgba(36, 198, 165, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  parkingName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    flex: 1,
    marginRight: 10,
  },
  rateText: {
    fontSize: 16,
    color: theme.colors.primary,
    fontWeight: '800',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
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
  mapIconButton: {
    padding: 6,
    backgroundColor: 'rgba(0, 242, 254, 0.1)',
    borderRadius: 8,
    marginRight: 8,
  },
  statsGrid: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16,
    padding: 15,
    marginBottom: 20,
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: 'white',
  },
  statLabel: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.4)',
    fontWeight: '700',
    marginTop: 2,
  },
  categoriesRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  miniCat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 8,
  },
  miniCatText: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '500',
  },
  emptyContainer: {
    marginTop: 100,
    alignItems: 'center',
    gap: 15,
  },
  emptyText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
  },
});
