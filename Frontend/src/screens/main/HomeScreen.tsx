import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme/theme';
import { useAuth } from '../../context/AuthContext';
import { i18n } from '../../i18n';

const { width } = Dimensions.get('window');

export const HomeScreen = ({ navigation }: any) => {
  const { user } = useAuth();
  
  // Extraer nombre real o del email
  const displayName = user?.profile?.first_name || (user?.email ? user.email.split('@')[0] : 'Usuario');

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
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

        {/* Hero Card - Active Status */}
        <LinearGradient
          colors={['#4facfe', '#00f2fe']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <View style={styles.heroContent}>
            <View>
              <Text style={styles.heroTitle}>{i18n.t('home.parking_status')}</Text>
              <Text style={styles.heroSubtitle}>{i18n.t('home.no_active_reservations')}</Text>
            </View>
            <View style={styles.heroIconContainer}>
              <Ionicons name="car-sport" size={40} color="white" />
            </View>
          </View>
          <TouchableOpacity style={styles.heroButton} onPress={() => navigation.navigate('MapSearch')}>
            <Text style={styles.heroButtonText}>Buscar Lugar</Text>
            <Ionicons name="arrow-forward" size={16} color="#00f2fe" />
          </TouchableOpacity>
        </LinearGradient>

        {/* Quick Actions Grid */}
        <Text style={styles.sectionTitle}>{i18n.t('home.quick_actions')}</Text>
        <View style={styles.grid}>
          <ActionCard icon="map-outline" title="Ver Mapa" color="#667eea" onPress={() => navigation.navigate('MapSearch')} />
          <ActionCard icon="wallet-outline" title="Mi Billetera" color="#764ba2" />
          <ActionCard icon="time-outline" title="Historial" color="#f093fb" />
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

        {/* Recent Activity (Placeholder) */}
        <Text style={styles.sectionTitle}>{i18n.t('home.recent_activity')}</Text>
        <View style={styles.emptyActivity}>
          <Ionicons name="notifications-off-outline" size={48} color={theme.colors.textSecondary} />
          <Text style={styles.emptyText}>{i18n.t('home.no_activity')}</Text>
        </View>

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
    color: '#00f2fe',
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
