import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { theme } from '../../theme/theme';
import { parkingApi } from '../../services/api';
import { i18n } from '../../i18n';

export const MyParkingsScreen = ({ navigation }: any) => {
  const [parkings, setParkings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchParkings = async () => {
    try {
      const data = await parkingApi.getParkings();
      setParkings(data);
    } catch (error) {
      console.error('Error fetching parkings:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchParkings();
    }, [])
  );

  const onRefresh = () => {
    setIsRefreshing(true);
    fetchParkings();
  };

  const handleDeleteParking = (id: number) => {
    Alert.alert(
      i18n.t('parkings.title'),
      i18n.t('parkings.delete_confirm'),
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Eliminar', 
          style: 'destructive',
          onPress: async () => {
            try {
              await parkingApi.deleteParking(id);
              fetchParkings();
            } catch (error) {
              Alert.alert('Error', 'No se pudo eliminar la cochera');
            }
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>{i18n.t('parkings.title')}</Text>
        <TouchableOpacity 
          style={styles.addButton} 
          onPress={() => navigation.navigate('ManageParking')}
        >
          <Ionicons name="add" size={28} color="white" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
        }
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        ) : parkings.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="business-outline" size={80} color="rgba(255,255,255,0.05)" />
            </View>
            <Text style={styles.emptyTitle}>No tienes cocheras aún</Text>
            <Text style={styles.emptySub}>Comienza registrando tu primera cochera para empezar a recibir reservas.</Text>
            <TouchableOpacity 
              style={styles.createButton}
              onPress={() => navigation.navigate('ManageParking')}
            >
              <LinearGradient
                colors={[theme.colors.primary, '#24C6A5']}
                style={styles.createGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.createButtonText}>Registrar Cochera</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : (
          parkings.map((p) => (
            <TouchableOpacity 
              key={p.id_parking} 
              style={styles.card}
              activeOpacity={0.9}
              onPress={() => navigation.navigate('ManageParking', { parking: p })}
            >
              <LinearGradient
                colors={['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.02)']}
                style={styles.cardGradient}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.mainInfo}>
                    <Text style={styles.parkingName}>{p.name}</Text>
                    <View style={styles.statusBadge}>
                      <View style={[styles.statusDot, { backgroundColor: p.categories?.length > 0 ? (p.total_available > 0 ? theme.colors.primary : theme.colors.error) : '#999' }]} />
                      <Text style={styles.statusText}>
                        {p.categories?.length > 0 ? (p.total_available > 0 ? 'ACTIVA' : 'SIN LUGARES') : 'INCOMPLETA'}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity 
                    style={styles.trashBtn}
                    onPress={() => handleDeleteParking(p.id_parking)}
                  >
                    <Ionicons name="trash-outline" size={20} color={theme.colors.error} />
                  </TouchableOpacity>
                </View>

                {/* Categories Summary */}
                <View style={styles.categoriesSection}>
                  {p.categories?.length > 0 ? (
                    p.categories.map((cat: any) => (
                      <View key={cat.id_category} style={styles.categoryRow}>
                        <View style={styles.catNameGroup}>
                          <Ionicons 
                            name={cat.name.toLowerCase().includes('moto') ? 'bicycle-outline' : 'car-outline'} 
                            size={16} 
                            color={theme.colors.textSecondary} 
                          />
                          <Text style={styles.catName}>{cat.name}</Text>
                        </View>
                        <Text style={styles.catAvailability}>
                          <Text style={{ color: cat.available > 0 ? theme.colors.primary : theme.colors.error }}>{cat.available}</Text>
                          <Text style={{ color: 'rgba(255,255,255,0.3)' }}> / {cat.max_capacity}</Text>
                        </Text>
                        <Text style={styles.catPrice}>${(p.base_hourly_rate * cat.price_multiplier).toFixed(0)}/h</Text>
                      </View>
                    ))
                  ) : (
                    <View style={styles.noCategoriesBox}>
                      <Ionicons name="warning-outline" size={20} color="#FFA500" />
                      <Text style={styles.noCategoriesText}>Requiere configurar categorías para ser visible</Text>
                    </View>
                  )}
                </View>

                <View style={styles.divider} />

                <View style={styles.cardFooter}>
                  <View style={styles.statsRow}>
                    <View style={styles.footerStat}>
                      <Text style={styles.statLabel}>TOTAL LUGARES</Text>
                      <Text style={styles.statValue}>{p.total_capacity}</Text>
                    </View>
                    <View style={styles.footerStat}>
                      <Text style={styles.statLabel}>DISPONIBLES</Text>
                      <Text style={[styles.statValue, { color: p.total_available > 0 ? theme.colors.primary : theme.colors.error }]}>
                        {p.total_available}
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.actionsRow}>
                    <TouchableOpacity 
                      style={styles.monitorBtnFull} 
                      onPress={() => navigation.navigate('RealtimeOccupancy', { id_parking: p.id_parking, parkingName: p.name })}
                    >
                      <Ionicons name="pulse" size={15} color="#00f2fe" />
                      <Text style={styles.monitorBtnText}>Monitorear</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={styles.editBtnFull} 
                      onPress={() => navigation.navigate('ManageParking', { parking: p })}
                    >
                      <Text style={styles.editBtnText}>Gestionar</Text>
                      <Ionicons name="chevron-forward" size={15} color={theme.colors.primary} />
                    </TouchableOpacity>
                  </View>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
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
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  scrollContent: {
    padding: theme.spacing.l,
    paddingBottom: 40,
  },
  loadingContainer: {
    marginTop: 100,
    alignItems: 'center',
  },
  emptyContainer: {
    marginTop: 60,
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.02)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 10,
  },
  emptySub: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 30,
  },
  createButton: {
    width: '100%',
    height: 56,
    borderRadius: 16,
    overflow: 'hidden',
  },
  createGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  createButtonText: {
    color: theme.colors.background,
    fontSize: 16,
    fontWeight: 'bold',
  },
  card: {
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  cardGradient: {
    padding: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  mainInfo: {
    flex: 1,
  },
  parkingName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 6,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 1,
  },
  trashBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,71,87,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoriesSection: {
    marginBottom: 20,
    gap: 12,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.02)',
    padding: 12,
    borderRadius: 14,
  },
  catNameGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1.5,
  },
  catName: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  catAvailability: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  catPrice: {
    flex: 1,
    color: theme.colors.primary,
    fontSize: 15,
    fontWeight: 'bold',
    textAlign: 'right',
  },
  noCategoriesBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,165,0,0.05)',
    padding: 15,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,165,0,0.2)',
  },
  noCategoriesText: {
    color: '#FFA500',
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginBottom: 15,
  },
  cardFooter: {
    gap: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  footerStat: {
    gap: 4,
    flex: 1,
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: theme.colors.textSecondary,
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  monitorBtnFull: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 242, 254, 0.1)',
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 242, 254, 0.25)',
  },
  monitorBtnText: {
    color: '#00f2fe',
    fontSize: 13,
    fontWeight: 'bold',
  },
  editBtnFull: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(36, 198, 165, 0.1)',
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(36, 198, 165, 0.25)',
  },
  editBtnText: {
    color: theme.colors.primary,
    fontSize: 13,
    fontWeight: 'bold',
  }
});
