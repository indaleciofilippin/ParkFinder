import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme/theme';
import { bookingApi } from '../../services/api';
import { i18n } from '../../i18n';
import { formatCurrency } from '../../utils/formatters';

export const MyBookingsScreen = ({ navigation }: any) => {
  const [bookings, setBookings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'current' | 'past'>('current');

  const fetchBookings = async () => {
    try {
      const data = await bookingApi.getMyBookings();
      // Sort by start time descending
      const sorted = data.sort((a: any, b: any) => 
        new Date(b.expected_start_time).getTime() - new Date(a.expected_start_time).getTime()
      );
      setBookings(sorted);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const onRefresh = () => {
    setIsRefreshing(true);
    fetchBookings();
  };

  const handleCancelBooking = async (id_booking: number) => {
    Alert.alert(
      '¿Cancelar reserva?',
      'Si cancelas con menos de 30 minutos de antelación al inicio, se aplicará el cobro total.',
      [
        { text: 'Volver', style: 'cancel' },
        { 
          text: 'Confirmar Cancelación', 
          style: 'destructive',
          onPress: async () => {
            try {
              setIsLoading(true);
              const result = await bookingApi.updateBookingStatus(id_booking, 'cancelled');
              Alert.alert('Estado', result.message);
              fetchBookings();
            } catch (error: any) {
              const msg = error.response?.data?.detail || error.message || 'No se pudo cancelar la reserva';
              Alert.alert('Error', msg);
            } finally {
              setIsLoading(false);
            }
          }
        }
      ]
    );
  };

  // Filter bookings based on activeTab
  const currentBookings = bookings.filter(b => 
    b.current_status === 'pending' || b.current_status === 'active'
  );

  const pastBookings = bookings.filter(b => 
    b.current_status !== 'pending' && b.current_status !== 'active'
  );

  const dataToShow = activeTab === 'current' ? currentBookings : pastBookings;

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'active':
        return { bg: 'rgba(0, 230, 118, 0.15)', text: '#00E676', label: 'Activa' };
      case 'pending':
        return { bg: 'rgba(0, 158, 227, 0.15)', text: '#009EE3', label: 'Pendiente' };
      case 'completed':
        return { bg: 'rgba(255, 255, 255, 0.1)', text: 'rgba(255,255,255,0.7)', label: 'Completada' };
      case 'cancelled':
        return { bg: 'rgba(255, 71, 87, 0.15)', text: '#ff4757', label: 'Cancelada' };
      case 'cancelled_with_penalty':
        return { bg: 'rgba(255, 140, 0, 0.15)', text: '#FF8C00', label: 'Multada' };
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
                name={item.current_status === 'active' ? "play-circle-outline" : "calendar-outline"} 
                size={22} 
                color={theme.colors.primary} 
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.bookingTitle}>Reserva #{item.id_booking}</Text>
              <Text style={styles.parkingName}>Cochera ID: {item.id_parking}</Text>
            </View>
            <View style={[styles.statusChip, { backgroundColor: statusInfo.bg }]}>
              <Text style={[styles.statusText, { color: statusInfo.text }]}>{statusInfo.label}</Text>
            </View>
          </View>
        </View>

        <View style={styles.cardDivider} />

        <View style={styles.detailsGrid}>
          <View style={styles.detailItem}>
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
                <Text style={styles.detailLabel}>Tarifa Aplicada</Text>
                <Text style={styles.detailValue}>{formatCurrency(Math.round(item.applied_rate))}/h</Text>
              </View>
            </View>
          )}

          {item.invoice_total != null && (
            <View style={[styles.detailItem, { marginTop: 12 }]}>
              <Ionicons
                name={item.invoice_status === 'paid' ? 'checkmark-circle-outline' : 'alert-circle-outline'}
                size={16}
                color={item.invoice_status === 'paid' ? '#00E676' : '#FF8C00'}
              />
              <View style={styles.detailTextCol}>
                <Text style={styles.detailLabel}>Total Cobrado</Text>
                <Text style={[styles.detailValue, { color: item.invoice_status === 'paid' ? '#00E676' : '#FF8C00', fontWeight: 'bold' }]}>
                  {formatCurrency(item.invoice_total)}
                  {item.invoice_status !== 'paid' && '  ⚠️ Pago pendiente'}
                </Text>
              </View>
            </View>
          )}
        </View>

        {item.current_status === 'pending' && (
          <TouchableOpacity 
            style={styles.cancelButton}
            onPress={() => handleCancelBooking(item.id_booking)}
          >
            <Ionicons name="close-circle-outline" size={18} color="#ff4757" />
            <Text style={styles.cancelButtonText}>Cancelar Reserva</Text>
          </TouchableOpacity>
        )}
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
        <Text style={styles.title}>Mis Reservas</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabsRow}>
        <TouchableOpacity 
          style={[styles.tabButton, activeTab === 'current' && styles.activeTab]}
          onPress={() => setActiveTab('current')}
        >
          <Text style={[styles.tabText, activeTab === 'current' && styles.activeTabText]}>
            Actuales ({currentBookings.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tabButton, activeTab === 'past' && styles.activeTab]}
          onPress={() => setActiveTab('past')}
        >
          <Text style={[styles.tabText, activeTab === 'past' && styles.activeTabText]}>
            Historial ({pastBookings.length})
          </Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <FlatList
          data={dataToShow}
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
                name={activeTab === 'current' ? "calendar-outline" : "folder-open-outline"} 
                size={64} 
                color="rgba(255,255,255,0.2)" 
              />
              <Text style={styles.emptyText}>
                {activeTab === 'current' 
                  ? 'No tienes reservas activas o pendientes.' 
                  : 'Tu historial de reservas está vacío.'}
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
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 15,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 16,
    marginHorizontal: 20,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
  },
  activeTab: {
    backgroundColor: 'rgba(36, 198, 165, 0.15)',
  },
  tabText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.4)',
    fontWeight: '600',
  },
  activeTabText: {
    color: theme.colors.primary,
    fontWeight: 'bold',
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
  parkingName: {
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
    fontSize: 11,
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
    marginBottom: 16,
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
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 71, 87, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 71, 87, 0.2)',
    borderRadius: 16,
    paddingVertical: 14,
    marginTop: 10,
  },
  cancelButtonText: {
    color: '#ff4757',
    fontWeight: 'bold',
    fontSize: 14,
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
