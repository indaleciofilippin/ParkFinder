import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, ActivityIndicator, Alert, RefreshControl, FlatList, Linking, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { theme } from '../../theme/theme';
import { parkingApi } from '../../services/api';

export const RealtimeOccupancyScreen = ({ route, navigation }: any) => {
  const { id_parking, parkingName } = route.params;
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'parked' | 'pending'>('parked');

  const fetchOccupancy = async () => {
    try {
      const res = await parkingApi.getRealtimeOccupancy(id_parking);
      setData(res);
    } catch (error: any) {
      console.error('Error fetching occupancy:', error);
      Alert.alert('Error', error.message || 'No se pudo obtener la ocupación en tiempo real');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchOccupancy();
    }, [id_parking])
  );

  const onRefresh = () => {
    setIsRefreshing(true);
    fetchOccupancy();
  };

  const handleCall = (phone: string) => {
    if (!phone) {
      Alert.alert('No disponible', 'Este usuario no registró número de teléfono');
      return;
    }
    Linking.openURL(`tel:${phone}`);
  };

  const formatTime = (isoString: string) => {
    if (!isoString) return '--:--';
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    } catch {
      return '--:--';
    }
  };

  const renderActiveCard = ({ item }: { item: any }) => (
    <View style={styles.occupancyCard}>
      <LinearGradient
        colors={['rgba(0, 242, 254, 0.08)', 'rgba(255,255,255,0.02)']}
        style={styles.cardGradient}
      >
        <View style={styles.cardHeader}>
          <View style={styles.driverInfo}>
            <Text style={styles.driverLabel}>CONDUCTOR</Text>
            <Text style={styles.driverName}>{item.first_name} {item.last_name}</Text>
          </View>
          <View style={[styles.statusBadge, styles.badgeActive]}>
            <View style={styles.pulseDot} />
            <Text style={styles.badgeTextActive}>DENTRO</Text>
          </View>
        </View>

        <View style={styles.detailsGrid}>
          {/* License Plate Plate Design */}
          <View style={styles.detailCol}>
            <Text style={styles.detailLabel}>PATENTE</Text>
            <View style={styles.licensePlateContainer}>
              <View style={styles.licensePlateBlueHeader}>
                <Text style={styles.licensePlateHeaderText}>MERCOSUR</Text>
              </View>
              <Text style={styles.licensePlateText}>{item.license_plate?.toUpperCase()}</Text>
            </View>
          </View>

          <View style={styles.detailCol}>
            <Text style={styles.detailLabel}>VEHÍCULO</Text>
            <View style={styles.vehicleTypeRow}>
              <Ionicons name="car-outline" size={16} color={theme.colors.primary} />
              <Text style={styles.vehicleText} numberOfLines={1}>{item.vehicle_model || 'No especificado'}</Text>
            </View>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.cardFooter}>
          <View style={styles.timeInfo}>
            <Ionicons name="time-outline" size={14} color="rgba(255,255,255,0.4)" />
            <Text style={styles.timeText}>Desde las {formatTime(item.start_time)}</Text>
          </View>
          <TouchableOpacity 
            style={styles.callButton}
            onPress={() => handleCall(item.phone)}
          >
            <Ionicons name="call" size={14} color="#00f2fe" />
            <Text style={styles.callButtonText}>Llamar</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </View>
  );

  const renderPendingCard = ({ item }: { item: any }) => (
    <View style={styles.occupancyCard}>
      <LinearGradient
        colors={['rgba(255, 165, 0, 0.08)', 'rgba(255,255,255,0.02)']}
        style={styles.cardGradient}
      >
        <View style={styles.cardHeader}>
          <View style={styles.driverInfo}>
            <Text style={styles.driverLabel}>RESERVA A NOMBRE DE</Text>
            <Text style={styles.driverName}>{item.first_name} {item.last_name}</Text>
          </View>
          <View style={[styles.statusBadge, styles.badgePending]}>
            <Text style={styles.badgeTextPending}>ESPERANDO</Text>
          </View>
        </View>

        <View style={styles.detailsGrid}>
          <View style={styles.detailCol}>
            <Text style={styles.detailLabel}>PATENTE</Text>
            <View style={styles.licensePlateContainer}>
              <View style={styles.licensePlateBlueHeader}>
                <Text style={styles.licensePlateHeaderText}>MERCOSUR</Text>
              </View>
              <Text style={styles.licensePlateText}>{item.license_plate?.toUpperCase()}</Text>
            </View>
          </View>

          <View style={styles.detailCol}>
            <Text style={styles.detailLabel}>VEHÍCULO</Text>
            <View style={styles.vehicleTypeRow}>
              <Ionicons name="car-outline" size={16} color="#FFA500" />
              <Text style={styles.vehicleText} numberOfLines={1}>{item.vehicle_model || 'No especificado'}</Text>
            </View>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.cardFooter}>
          <View style={styles.timeInfo}>
            <Ionicons name="calendar-outline" size={14} color="rgba(255,255,255,0.4)" />
            <Text style={styles.timeText}>Reserva: {formatTime(item.start_time)} a {formatTime(item.end_time)}</Text>
          </View>
          <TouchableOpacity 
            style={[styles.callButton, styles.callButtonPending]}
            onPress={() => handleCall(item.phone)}
          >
            <Ionicons name="call" size={14} color="#FFA500" />
            <Text style={[styles.callButtonText, { color: '#FFA500' }]}>Llamar</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.title} numberOfLines={1}>Ocupación en Vivo</Text>
          <Text style={styles.subtitle} numberOfLines={1}>{parkingName}</Text>
        </View>
        <TouchableOpacity style={styles.refreshIconBtn} onPress={onRefresh}>
          <Ionicons name="refresh" size={22} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Obteniendo datos de sensores...</Text>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          {/* KPI Dashboard Row */}
          <View style={styles.kpiRow}>
            <View style={styles.kpiBox}>
              <Text style={styles.kpiVal}>{data?.parked_count || 0}</Text>
              <Text style={styles.kpiLabel}>ACTIVOS</Text>
            </View>
            <View style={styles.kpiBox}>
              <Text style={[styles.kpiVal, { color: '#FFA500' }]}>{data?.pending_count || 0}</Text>
              <Text style={styles.kpiLabel}>RESERVAS</Text>
            </View>
            <View style={styles.kpiBox}>
              <Text style={[styles.kpiVal, { color: '#24C6A5' }]}>{data?.total_available ?? 0}</Text>
              <Text style={styles.kpiLabel}>LIBRES</Text>
            </View>
          </View>

          {/* Segmented Control / Tabs */}
          <View style={styles.tabContainer}>
            <TouchableOpacity 
              style={[styles.tabButton, activeTab === 'parked' && styles.tabButtonActive]}
              onPress={() => setActiveTab('parked')}
            >
              <Ionicons name="enter" size={16} color={activeTab === 'parked' ? 'black' : 'rgba(255,255,255,0.4)'} />
              <Text style={[styles.tabText, activeTab === 'parked' && styles.tabTextActive]}>
                En Cochera ({data?.currently_parked?.length || 0})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.tabButton, activeTab === 'pending' && styles.tabButtonActive]}
              onPress={() => setActiveTab('pending')}
            >
              <Ionicons name="time" size={16} color={activeTab === 'pending' ? 'black' : 'rgba(255,255,255,0.4)'} />
              <Text style={[styles.tabText, activeTab === 'pending' && styles.tabTextActive]}>
                Reservas ({data?.upcoming_reservations?.length || 0})
              </Text>
            </TouchableOpacity>
          </View>

          {/* List Content */}
          {activeTab === 'parked' ? (
            <FlatList
              data={data?.currently_parked || []}
              renderItem={renderActiveCard}
              keyExtractor={(item) => item.id_booking.toString()}
              contentContainerStyle={styles.listContent}
              refreshControl={
                <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
              }
              ListEmptyComponent={
                <View style={styles.emptyBox}>
                  <Ionicons name="cafe-outline" size={60} color="rgba(255,255,255,0.1)" />
                  <Text style={styles.emptyBoxTitle}>Cochera vacía en este momento</Text>
                  <Text style={styles.emptyBoxSub}>Los vehículos aparecerán aquí inmediatamente al ingresar por la barrera.</Text>
                </View>
              }
            />
          ) : (
            <FlatList
              data={data?.upcoming_reservations || []}
              renderItem={renderPendingCard}
              keyExtractor={(item) => item.id_booking.toString()}
              contentContainerStyle={styles.listContent}
              refreshControl={
                <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
              }
              ListEmptyComponent={
                <View style={styles.emptyBox}>
                  <Ionicons name="calendar-outline" size={60} color="rgba(255,255,255,0.1)" />
                  <Text style={styles.emptyBoxTitle}>Sin reservas para hoy</Text>
                  <Text style={styles.emptyBoxSub}>No hay reservas pendientes programadas para esta cochera.</Text>
                </View>
              }
            />
          )}
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0f24',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.l,
    paddingVertical: theme.spacing.m,
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
    marginLeft: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  subtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 2,
  },
  refreshIconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(36, 198, 165, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
  },
  kpiRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 20,
    marginTop: 10,
  },
  kpiBox: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiVal: {
    fontSize: 20,
    fontWeight: '900',
    color: '#00f2fe',
  },
  kpiLabel: {
    fontSize: 8,
    color: 'rgba(255,255,255,0.4)',
    fontWeight: '800',
    marginTop: 4,
    letterSpacing: 1,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.04)',
    marginHorizontal: 20,
    padding: 4,
    borderRadius: 14,
    marginBottom: 16,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  tabButtonActive: {
    backgroundColor: '#00f2fe',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.5)',
  },
  tabTextActive: {
    color: '#000',
    fontWeight: '700',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  occupancyCard: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    marginBottom: 16,
    backgroundColor: 'rgba(10, 15, 36, 0.4)',
  },
  cardGradient: {
    padding: 18,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  driverInfo: {
    flex: 1,
  },
  driverLabel: {
    fontSize: 8,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 1,
    marginBottom: 4,
  },
  driverName: {
    fontSize: 16,
    fontWeight: '700',
    color: 'white',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  badgeActive: {
    backgroundColor: 'rgba(0, 242, 254, 0.15)',
  },
  badgePending: {
    backgroundColor: 'rgba(255, 165, 0, 0.15)',
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#00f2fe',
  },
  badgeTextActive: {
    fontSize: 9,
    fontWeight: '900',
    color: '#00f2fe',
    letterSpacing: 0.5,
  },
  badgeTextPending: {
    fontSize: 9,
    fontWeight: '900',
    color: '#FFA500',
    letterSpacing: 0.5,
  },
  detailsGrid: {
    flexDirection: 'row',
    gap: 15,
    marginBottom: 16,
  },
  detailCol: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 8,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.3)',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  licensePlateContainer: {
    backgroundColor: '#fff',
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    alignSelf: 'flex-start',
    minWidth: 90,
  },
  licensePlateBlueHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: '#0033A0', // Mercosur blue stripe!
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  licensePlateHeaderText: {
    display: 'none',
  },
  licensePlateText: {
    color: '#000',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  vehicleTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 28,
  },
  vehicleText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginBottom: 14,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timeText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
  },
  callButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 242, 254, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  callButtonPending: {
    backgroundColor: 'rgba(255, 165, 0, 0.1)',
  },
  callButtonText: {
    color: '#00f2fe',
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 30,
    gap: 12,
  },
  emptyBoxTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  emptyBoxSub: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  }
});
