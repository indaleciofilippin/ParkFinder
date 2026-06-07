import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { theme } from '../../theme/theme';
import { parkingApi, bookingApi } from '../../services/api';
import { formatCurrency } from '../../utils/formatters';

const { width } = Dimensions.get('window');

export const OwnerEarningsScreen = ({ navigation }: any) => {
  const [parkings, setParkings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Stats states
  const [dailyEarnings, setDailyEarnings] = useState(0);
  const [weeklyEarnings, setWeeklyEarnings] = useState(0);
  const [monthlyEarnings, setMonthlyEarnings] = useState(0);
  const [totalBookingsCount, setTotalBookingsCount] = useState(0);
  const [completedBookingsCount, setCompletedBookingsCount] = useState(0);
  const [estimatedFutureEarnings, setEstimatedFutureEarnings] = useState(0);

  const fetchEarningsData = async () => {
    try {
      const parkData = await parkingApi.getParkings();
      setParkings(parkData);

      let dailySum = 0;
      let weeklySum = 0;
      let monthlySum = 0;
      let futureSum = 0;
      let totalCount = 0;
      let completedCount = 0;

      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      const oneDay = 24 * 60 * 60 * 1000;
      const sevenDaysAgo = todayStart - 7 * oneDay;
      const thirtyDaysAgo = todayStart - 30 * oneDay;

      // Fetch bookings for each parking lot owned by the user
      for (const parking of parkData) {
        const bookingsData = await bookingApi.getParkingBookings(parking.id_parking);
        
        for (const booking of bookingsData) {
          // Ignore cancelled bookings (unless they had penalty, but let's keep it simple)
          if (booking.current_status === 'cancelled') continue;

          totalCount++;
          if (booking.current_status === 'completed') {
            completedCount++;
          }

          // Calculate estimated subtotal
          const start = new Date(booking.expected_start_time).getTime();
          const end = new Date(booking.expected_end_time).getTime();
          const durationHours = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60)));
          const estimatedCost = durationHours * (booking.applied_rate || 0);

          if (booking.current_status === 'pending') {
            futureSum += estimatedCost;
          }

          // Distribute based on transaction date
          if (start >= todayStart) {
            dailySum += estimatedCost;
          }
          if (start >= sevenDaysAgo) {
            weeklySum += estimatedCost;
          }
          if (start >= thirtyDaysAgo) {
            monthlySum += estimatedCost;
          }
        }
      }

      setDailyEarnings(dailySum);
      setWeeklyEarnings(weeklySum);
      setMonthlyEarnings(monthlySum);
      setEstimatedFutureEarnings(futureSum);
      setTotalBookingsCount(totalCount);
      setCompletedBookingsCount(completedCount);

    } catch (error) {
      console.error('Error calculating owner earnings:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchEarningsData();
    }, [])
  );

  const onRefresh = () => {
    setIsRefreshing(true);
    fetchEarningsData();
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Estimación de Ganancias</Text>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
          }
        >
          
          {/* Main Earnings Panel */}
          <View style={styles.earningsDashboard}>
            <View style={styles.dashboardSection}>
              <Text style={styles.dashboardLabel}>MENSUAL ESTIMADO</Text>
              <Text style={styles.dashboardValue}>{formatCurrency(Math.round(monthlyEarnings))}</Text>
              <Text style={styles.dashboardSubtitle}>Últimos 30 días de reservas activas o completadas</Text>
            </View>

            <View style={styles.dashboardDivider} />

            <View style={styles.statsRow}>
              <View style={styles.miniStat}>
                <Text style={styles.miniLabel}>HOY</Text>
                <Text style={styles.miniValue}>{formatCurrency(Math.round(dailyEarnings))}</Text>
              </View>
              <View style={styles.miniDivider} />
              <View style={styles.miniStat}>
                <Text style={styles.miniLabel}>SEMANAL</Text>
                <Text style={[styles.miniValue, { color: '#00E676' }]}>{formatCurrency(Math.round(weeklyEarnings))}</Text>
              </View>
            </View>
          </View>

          {/* Detailed breakdown Cards */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, marginLeft: 4, marginRight: 4 }}>
            <Text style={[styles.sectionTitle, { marginBottom: 0, marginLeft: 0 }]}>Resumen Financiero</Text>
            <TouchableOpacity 
              style={{ backgroundColor: 'rgba(36, 198, 165, 0.1)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(36, 198, 165, 0.3)' }}
              onPress={() => navigation.navigate('BankDetails')}
            >
              <Text style={{ color: theme.colors.primary, fontWeight: 'bold', fontSize: 12 }}>Configurar CBU</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.detailsGrid}>
            <View style={styles.detailCard}>
              <View style={[styles.iconBox, { backgroundColor: 'rgba(0, 242, 254, 0.1)' }]}>
                <Ionicons name="trending-up-outline" size={24} color="#00f2fe" />
              </View>
              <Text style={styles.detailValueText}>{formatCurrency(Math.round(estimatedFutureEarnings))}</Text>
              <Text style={styles.detailLabelText}>Reservas Pendientes</Text>
              <Text style={styles.detailSubText}>Ganancia potencial a cobrar</Text>
            </View>

            <View style={styles.detailCard}>
              <View style={[styles.iconBox, { backgroundColor: 'rgba(36, 198, 165, 0.1)' }]}>
                <Ionicons name="checkbox-outline" size={24} color={theme.colors.primary} />
              </View>
              <Text style={styles.detailValueText}>{completedBookingsCount} / {totalBookingsCount}</Text>
              <Text style={styles.detailLabelText}>Reservas Completadas</Text>
              <Text style={styles.detailSubText}>Tasa de efectividad de uso</Text>
            </View>
          </View>

          {/* Information Notice */}
          <View style={styles.infoBox}>
            <Ionicons name="information-circle-outline" size={20} color={theme.colors.primary} />
            <Text style={styles.infoText}>
              Las estimaciones se calculan en tiempo real sumando la duración en horas multiplicada por la tasa horaria de cada reserva (excluyendo cancelaciones). Las tarifas finales pueden variar si los conductores extienden su estadía.
            </Text>
          </View>

          {/* Cochera List Overview */}
          <Text style={styles.sectionTitle}>Distribución por Cochera</Text>
          {parkings.map((p) => (
            <View key={p.id_parking} style={styles.parkingRow}>
              <View style={styles.parkingInfo}>
                <Ionicons name="business" size={20} color="white" />
                <Text style={styles.parkingName}>{p.name}</Text>
              </View>
              <Text style={styles.parkingCapacity}>{p.total_capacity} lugares totales</Text>
            </View>
          ))}

        </ScrollView>
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
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  earningsDashboard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 24,
    padding: 25,
    marginBottom: 25,
  },
  dashboardSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  dashboardLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 1,
  },
  dashboardValue: {
    fontSize: 48,
    fontWeight: '800',
    color: theme.colors.primary,
    marginVertical: 5,
  },
  dashboardSubtitle: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.3)',
    textAlign: 'center',
  },
  dashboardDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginVertical: 10,
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  miniStat: {
    flex: 1,
    alignItems: 'center',
  },
  miniDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  miniLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 0.5,
  },
  miniValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 15,
    marginLeft: 4,
  },
  detailsGrid: {
    flexDirection: 'row',
    gap: 15,
    marginBottom: 25,
  },
  detailCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: 20,
    padding: 16,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailValueText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  detailLabelText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.85)',
    marginBottom: 2,
  },
  detailSubText: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.3)',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(36, 198, 165, 0.05)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(36, 198, 165, 0.15)',
    gap: 12,
    marginBottom: 25,
  },
  infoText: {
    flex: 1,
    color: 'rgba(255,255,255,0.6)',
    fontSize: 11,
    lineHeight: 16,
  },
  parkingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.02)',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    marginBottom: 10,
  },
  parkingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  parkingName: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  parkingCapacity: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
  },
});
