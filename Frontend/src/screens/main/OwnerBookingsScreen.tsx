import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { theme } from '../../theme/theme';
import { parkingApi, bookingApi } from '../../services/api';
import { formatCurrency } from '../../utils/formatters';

export const OwnerBookingsScreen = ({ navigation }: any) => {
  const [parkings, setParkings] = useState<any[]>([]);
  const [selectedParking, setSelectedParking] = useState<any | null>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchParkingsAndBookings = async () => {
    try {
      const parkData = await parkingApi.getParkings();
      setParkings(parkData);
      
      if (parkData.length > 0) {
        // If we haven't selected a parking lot yet or the selected one isn't in the list
        const currentSelect = selectedParking 
          ? parkData.find((p: any) => p.id_parking === selectedParking.id_parking) 
          : null;
          
        const activeParking = currentSelect || parkData[0];
        setSelectedParking(activeParking);
        
        // Fetch bookings for the active parking lot
        const bookData = await bookingApi.getParkingBookings(activeParking.id_parking);
        // Sort by start time descending
        const sorted = bookData.sort((a: any, b: any) => 
          new Date(b.expected_start_time).getTime() - new Date(a.expected_start_time).getTime()
        );
        setBookings(sorted);
      }
    } catch (error) {
      console.error('Error fetching owner data:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchParkingsAndBookings();
    }, [selectedParking?.id_parking])
  );

  const handleSelectParking = async (parking: any) => {
    setSelectedParking(parking);
    setIsLoading(true);
    try {
      const bookData = await bookingApi.getParkingBookings(parking.id_parking);
      const sorted = bookData.sort((a: any, b: any) => 
        new Date(b.expected_start_time).getTime() - new Date(a.expected_start_time).getTime()
      );
      setBookings(sorted);
    } catch (error) {
      console.error('Error switching parking bookings:', error);
      Alert.alert('Error', 'No se pudieron obtener las reservas de esta cochera');
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = () => {
    setIsRefreshing(true);
    fetchParkingsAndBookings();
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'active':
        return { bg: 'rgba(0, 230, 118, 0.15)', text: '#00E676', label: 'En Cochera' };
      case 'pending':
        return { bg: 'rgba(0, 158, 227, 0.15)', text: '#009EE3', label: 'Pendiente' };
      case 'completed':
        return { bg: 'rgba(255, 255, 255, 0.1)', text: 'rgba(255,255,255,0.7)', label: 'Completada' };
      case 'cancelled':
        return { bg: 'rgba(255, 71, 87, 0.15)', text: '#ff4757', label: 'Cancelada' };
      case 'cancelled_with_penalty':
        return { bg: 'rgba(255, 140, 0, 0.15)', text: '#FF8C00', label: 'Multada / Cancelada' };
      default:
        return { bg: 'rgba(255, 255, 255, 0.05)', text: 'white', label: status };
    }
  };

  const renderBookingItem = ({ item }: { item: any }) => {
    const statusInfo = getStatusStyle(item.current_status);
    const startDate = new Date(item.expected_start_time);
    const endDate = new Date(item.expected_end_time);

    return (
      <View style={styles.bookingCard}>
        <View style={styles.cardHeader}>
          <View style={styles.headerTitleRow}>
            <View style={styles.iconContainer}>
              <Ionicons 
                name={item.current_status === 'active' ? "log-in-outline" : "calendar-outline"} 
                size={22} 
                color={theme.colors.primary} 
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.bookingTitle} numberOfLines={1}>{item.parking_name || `Reserva #${item.id_booking}`}</Text>
              <Text style={styles.driverId}>ID Conductor: {item.id_profile}</Text>
            </View>
            <View style={[styles.statusChip, { backgroundColor: statusInfo.bg }]}>
              <Text style={[styles.statusText, { color: statusInfo.text }]}>{statusInfo.label}</Text>
            </View>
          </View>
        </View>

        <View style={styles.cardDivider} />

        <View style={styles.detailsGrid}>
          {/* License Plate Indicator - Highly prominent for owners */}
          <View style={styles.plateRow}>
            <Ionicons name="car-sport-outline" size={18} color="rgba(255,255,255,0.4)" />
            <Text style={styles.detailLabel}>Patente Autorizada: </Text>
            <View style={styles.plateBadge}>
              <Text style={styles.plateText}>{item.license_plate || 'SIN PATENTE'}</Text>
            </View>
          </View>

          <View style={[styles.detailItem, { marginTop: 14 }]}>
            <Ionicons name="time-outline" size={16} color="rgba(255,255,255,0.4)" />
            <View style={styles.detailTextCol}>
              <Text style={styles.detailLabel}>Entrada Estimada</Text>
              <Text style={styles.detailValue}>
                {startDate.toLocaleDateString()} a las {startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          </View>

          <View style={[styles.detailItem, { marginTop: 12 }]}>
            <Ionicons name="time-outline" size={16} color="rgba(255,255,255,0.4)" />
            <View style={styles.detailTextCol}>
              <Text style={styles.detailLabel}>Salida Estimada</Text>
              <Text style={styles.detailValue}>
                {endDate.toLocaleDateString()} a las {endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          </View>

          {item.applied_rate !== undefined && (
            <View style={[styles.detailItem, { marginTop: 12 }]}>
              <Ionicons name="cash-outline" size={16} color="rgba(255,255,255,0.4)" />
              <View style={styles.detailTextCol}>
                <Text style={styles.detailLabel}>Tasa Tarifaria</Text>
                <Text style={styles.detailValue}>{formatCurrency(Math.round(item.applied_rate))}/h</Text>
              </View>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Reservas Recibidas</Text>
      </View>

      {/* Cochera Selector (Horizontal Filter Bar) */}
      <View style={styles.selectorSection}>
        <Text style={styles.selectorLabel}>Cochera seleccionada:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.parkingScroll} contentContainerStyle={{ paddingRight: 40 }}>
          {parkings.map((p) => (
            <TouchableOpacity 
              key={p.id_parking}
              style={[styles.parkingTab, selectedParking?.id_parking === p.id_parking && styles.selectedParkingTab]}
              onPress={() => handleSelectParking(p)}
            >
              <Ionicons name="business" size={16} color={selectedParking?.id_parking === p.id_parking ? theme.colors.background : theme.colors.primary} style={{ marginRight: 6 }} />
              <Text style={[styles.parkingTabText, selectedParking?.id_parking === p.id_parking && styles.selectedParkingTabText]}>
                {p.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={(item) => item.id_booking.toString()}
          renderItem={renderBookingItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons 
                name="calendar-outline" 
                size={64} 
                color="rgba(255,255,255,0.15)" 
              />
              <Text style={styles.emptyText}>
                No se registraron reservas para esta cochera todavía.
              </Text>
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
  selectorSection: {
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  selectorLabel: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginBottom: 10,
    marginLeft: 4,
  },
  parkingScroll: {
    flexGrow: 0,
    marginBottom: 8,
  },
  parkingTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginRight: 10,
  },
  selectedParkingTab: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  parkingTabText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 13,
  },
  selectedParkingTabText: {
    color: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 20,
    gap: 16,
  },
  bookingCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 20,
    overflow: 'hidden',
  },
  cardHeader: {
    marginBottom: 14,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(36, 198, 165, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bookingTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  driverId: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 2,
  },
  statusChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginBottom: 16,
  },
  detailsGrid: {
    marginBottom: 4,
  },
  plateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  plateBadge: {
    backgroundColor: '#00f2fe20',
    borderWidth: 1.5,
    borderColor: '#00f2fe',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginLeft: 8,
  },
  plateText: {
    color: '#00f2fe',
    fontWeight: 'bold',
    fontSize: 14,
    letterSpacing: 0.5,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  detailTextCol: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.3)',
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  detailValue: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '500',
    marginTop: 2,
  },
  emptyContainer: {
    marginTop: 80,
    alignItems: 'center',
    gap: 15,
  },
  emptyText: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.35)',
    textAlign: 'center',
    paddingHorizontal: 40,
    lineHeight: 22,
  },
});
