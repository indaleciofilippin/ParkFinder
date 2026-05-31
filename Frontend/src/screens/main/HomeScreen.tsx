import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme/theme';
import { useAuth } from '../../context/AuthContext';
import { bookingApi } from '../../services/api';
import { i18n } from '../../i18n';
import { useFocusEffect } from '@react-navigation/native';

const { width } = Dimensions.get('window');

export const HomeScreen = ({ navigation }: any) => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const fetchBookings = async () => {
    try {
      const data = await bookingApi.getMyBookings();
      // Filtrar por activas o pendientes
      const active = data.filter((b: any) => b.current_status === 'active' || b.current_status === 'pending');
      setBookings(active);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleCancelBooking = async (id_booking: number) => {
    Alert.alert(
      '¿Cancelar reserva?',
      'Si cancelas con menos de 30 minutos de antelación, se aplicará el cobro total.',
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
              const msg = error.response?.data?.detail || error.message;
              Alert.alert('Error', msg);
            } finally {
              setIsLoading(false);
            }
          }
        }
      ]
    );
  };

  useFocusEffect(
    useCallback(() => {
      fetchBookings();
    }, [])
  );

  const onRefresh = () => {
    setIsRefreshing(true);
    fetchBookings();
  };

  // Extraer nombre real o del email
  const displayName = user?.profile?.first_name || (user?.email ? user.email.split('@')[0] : 'Usuario');
  const activeBooking = bookings.length > 0 ? bookings[0] : null;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
        }
      >
        
        {/* Header Section */}
        <View style={styles.header}>
          <View>
            <Text style={styles.welcomeText}>{i18n.t('home.welcome_back') || 'Bienvenido de nuevo,'}</Text>
            <Text style={styles.nameText}>{displayName}</Text>
          </View>
          <TouchableOpacity 
            style={styles.profileButton} 
            onPress={() => navigation.navigate('Profile')}
          >
            <Ionicons name="person-outline" size={24} color={theme.colors.text} />
          </TouchableOpacity>
        </View>

        {/* Hero Card - Conditional based on role */}
        {(user?.role === 'driver' || user?.role === 'dev' || user?.role === 'admin') ? (
          <LinearGradient
            colors={activeBooking ? ['#4facfe', '#00f2fe'] : ['#2c3e50', '#34495e']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroCard}
          >
            <View style={styles.heroContent}>
              <View style={{ flex: 1 }}>
                <Text style={styles.heroTitle}>
                  {activeBooking ? 'Reserva Activa' : i18n.t('home.parking_status')}
                </Text>
                <Text style={styles.heroSubtitle}>
                  {activeBooking 
                    ? `Tienes una reserva en curso o pendiente.`
                    : i18n.t('home.no_active_reservations')}
                </Text>
              </View>
              <View style={styles.heroIconContainer}>
                <Ionicons name={activeBooking ? "time" : "car-sport"} size={40} color="white" />
              </View>
            </View>
            
            <TouchableOpacity 
              style={styles.heroButton}
              onPress={() => navigation.navigate('MapSearch')}
            >
              <Text style={[styles.heroButtonText, { color: activeBooking ? '#00f2fe' : '#34495e' }]}>
                {i18n.t('bookings.find_parking')}
              </Text>
              <Ionicons name="arrow-forward" size={16} color={activeBooking ? '#00f2fe' : '#34495e'} />
            </TouchableOpacity>
          </LinearGradient>
        ) : (
          /* Parking Owner Hero */
          <LinearGradient
            colors={['#1e3c72', '#2a5298']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroCard}
          >
            <View style={styles.heroContent}>
              <View style={{ flex: 1 }}>
                <Text style={styles.heroTitle}>Gestión de Negocio</Text>
                <Text style={styles.heroSubtitle}>Monitorea y administra tus cocheras en tiempo real.</Text>
              </View>
              <View style={styles.heroIconContainer}>
                <Ionicons name="stats-chart" size={40} color="white" />
              </View>
            </View>
            <TouchableOpacity 
              style={styles.heroButton}
              onPress={() => navigation.navigate('MyParkings')}
            >
              <Text style={[styles.heroButtonText, { color: '#2a5298' }]}>Ir a mis cocheras</Text>
              <Ionicons name="arrow-forward" size={16} color="#2a5298" />
            </TouchableOpacity>
          </LinearGradient>
        )}

        {/* Quick Actions Grid */}
        <Text style={styles.sectionTitle}>{i18n.t('home.quick_actions')}</Text>
        <View style={styles.grid}>
          {/* Driver specific actions */}
          {(user?.role === 'driver' || user?.role === 'dev' || user?.role === 'admin') && (
            <>
              <ActionCard icon="map-outline" title="Ver Mapa" color="#667eea" onPress={() => navigation.navigate('MapSearch')} />
              <ActionCard icon="list-outline" title="Lista Cocheras" color="#00f2fe" onPress={() => navigation.navigate('FindParking')} />
              <ActionCard 
                icon="time-outline" 
                title={i18n.t('bookings.title')} 
                color="#f093fb" 
                onPress={() => navigation.navigate('MyBookings')}
              />
            </>
          )}

          {/* Owner specific actions */}
          {(user?.role === 'park' || user?.role === 'dev' || user?.role === 'admin') && (
            <>
              <ActionCard 
                icon="business-outline" 
                title="Mis Cocheras" 
                color="#24C6A5" 
                onPress={() => navigation.navigate('MyParkings')}
              />
              <ActionCard 
                icon="analytics-outline" 
                title="Ganancias" 
                color="#764ba2" 
                onPress={() => navigation.navigate('OwnerEarnings')}
              />
              <ActionCard 
                icon="list-outline" 
                title="Reservas Recibidas" 
                color="#FF8C00" 
                onPress={() => navigation.navigate('OwnerBookings')}
              />
              <ActionCard 
                icon="git-compare-outline" 
                title="Simular Barrera" 
                color="#FF3366" 
                onPress={() => navigation.navigate('BarrierSimulator')} 
              />
            </>
          )}

          <ActionCard 
            icon="person-outline" 
            title={i18n.t('profile.title')} 
            color="#f5576c" 
            onPress={() => navigation.navigate('Profile')}
          />

          {(user?.role === 'admin' || user?.role === 'dev') && (
            <ActionCard 
              icon="shield-outline" 
              title={i18n.t('dashboard.title')} 
              color="#FFD700" 
              onPress={() => navigation.navigate('AdminDashboard')}
            />
          )}
        </View>

        {/* Recent Activity */}
        <Text style={styles.sectionTitle}>{i18n.t('home.recent_activity')}</Text>
        {isLoading ? (
          <ActivityIndicator color={theme.colors.primary} />
        ) : bookings.length > 0 ? (
          <View style={styles.bookingList}>
            {bookings.map((booking) => (
              <View key={booking.id_booking} style={styles.bookingCard}>
                <View style={styles.bookingIcon}>
                  <Ionicons name="calendar" size={24} color={theme.colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.bookingTitle}>Reserva #{booking.id_booking}</Text>
                  <Text style={styles.bookingDate}>
                    {new Date(booking.expected_start_time).toLocaleDateString()} - {new Date(booking.expected_start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
                <View style={styles.statusChip}>
                  <Text style={styles.statusText}>{i18n.t(`bookings.status.${booking.current_status}`)}</Text>
                </View>
                {booking.current_status === 'pending' && (
                  <TouchableOpacity 
                    style={styles.cancelBookingBtn}
                    onPress={() => handleCancelBooking(booking.id_booking)}
                  >
                    <Ionicons name="trash-outline" size={20} color="#ff4757" />
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyActivity}>
            <Ionicons name="notifications-off-outline" size={48} color={theme.colors.textSecondary} />
            <Text style={styles.emptyText}>{i18n.t('home.no_activity')}</Text>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
};

const ActionCard = ({ icon, title, color, onPress }: { icon: any, title: string, color: string, onPress?: () => void }) => (
  <TouchableOpacity style={styles.card} onPress={onPress}>
    <View style={[styles.cardIconContainer, { backgroundColor: color + '20' }]}>
      <Ionicons name={icon} size={28} color={color} />
    </View>
    <Text style={styles.cardTitle}>{title}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    padding: theme.spacing.l,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
    marginTop: theme.spacing.m,
  },
  welcomeText: {
    fontSize: theme.typography.sizes.body,
    color: theme.colors.textSecondary,
    fontWeight: theme.typography.weights.medium,
  },
  nameText: {
    fontSize: theme.typography.sizes.h2,
    color: theme.colors.text,
    fontWeight: theme.typography.weights.bold,
  },
  profileButton: {
    width: 45,
    height: 45,
    borderRadius: 15,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  heroCard: {
    borderRadius: 24,
    padding: theme.spacing.l,
    marginBottom: theme.spacing.xl,
    shadowColor: '#4facfe',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
  heroContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.l,
  },
  heroTitle: {
    color: 'white',
    fontSize: theme.typography.sizes.h3,
    fontWeight: theme.typography.weights.bold,
  },
  heroSubtitle: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: theme.typography.sizes.body,
    marginTop: 4,
  },
  heroIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  heroButton: {
    backgroundColor: 'white',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  heroButtonText: {
    fontWeight: theme.typography.weights.bold,
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: theme.typography.sizes.h3,
    color: theme.colors.text,
    fontWeight: theme.typography.weights.bold,
    marginBottom: theme.spacing.l,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.xl,
  },
  card: {
    width: (width - theme.spacing.l * 2 - theme.spacing.m) / 2,
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    padding: theme.spacing.m,
    marginBottom: theme.spacing.m,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
  },
  cardIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.s,
  },
  cardTitle: {
    color: theme.colors.text,
    fontSize: theme.typography.sizes.body,
    fontWeight: theme.typography.weights.medium,
  },
  bookingList: {
    gap: theme.spacing.m,
    marginBottom: theme.spacing.xl,
  },
  bookingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    padding: theme.spacing.m,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: theme.spacing.m,
  },
  bookingIcon: {
    width: 45,
    height: 45,
    borderRadius: 12,
    backgroundColor: 'rgba(36, 198, 165, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bookingTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  bookingDate: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  statusChip: {
    backgroundColor: 'rgba(36, 198, 165, 0.15)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 10,
    color: theme.colors.primary,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  cancelBookingBtn: {
    marginLeft: 10,
    padding: 8,
    backgroundColor: 'rgba(255, 71, 87, 0.1)',
    borderRadius: 10,
  },
  emptyActivity: {
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    padding: theme.spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderStyle: 'dashed',
    minHeight: 150,
  },
  emptyText: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.sizes.body,
    marginTop: theme.spacing.s,
  }
});
