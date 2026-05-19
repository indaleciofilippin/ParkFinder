import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Animated,
  Easing,
  ActivityIndicator,
  Alert,
  Dimensions,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../../theme/theme';
import { parkingApi, vehicleApi, bookingApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const { width } = Dimensions.get('window');

export const BarrierSimulatorScreen = ({ navigation }: any) => {
  const { user } = useAuth();
  
  // State
  const [parkings, setParkings] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [selectedParking, setSelectedParking] = useState<any>(null);
  const [licensePlate, setLicensePlate] = useState('');
  const [loading, setLoading] = useState(false);
  const [barrierState, setBarrierState] = useState<'closed' | 'open'>('closed');
  const [logs, setLogs] = useState<string[]>(['[SISTEMA] Listo. Selecciona una cochera e ingresa una patente.']);
  const [autoCloseCountdown, setAutoCloseCountdown] = useState<number | null>(null);
  const [autoSync, setAutoSync] = useState(false);
  const [lastEventTimestamp, setLastEventTimestamp] = useState<string | null>(null);

  // Animated values
  const barrierRotation = useRef(new Animated.Value(0)).current; // 0 for closed (0 deg), 1 for open (-90 deg)
  const pulseAnim = useRef(new Animated.Value(0.4)).current;
  const countdownTimer = useRef<NodeJS.Timeout | null>(null);

  // Pulse animation for the barrier status light
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.0,
          duration: 1000,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.ease)
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.4,
          duration: 1000,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.ease)
        })
      ])
    ).start();
  }, []);

  // Fetch initial data
  useEffect(() => {
    fetchParkings();
    fetchVehicles();
  }, []);

  // Realtime Polling for IoT/AI camera scans
  useEffect(() => {
    // If the barrier is already open, pause polling to prevent spamming/reopening until it finishes closing
    if (!autoSync || !selectedParking || barrierState === 'open') {
      return;
    }

    // Force-reset backend barrier lock only on first load of the sync to avoid premature resets during normal cycles
    if (lastEventTimestamp === null) {
      bookingApi.resetBarrierState(selectedParking.id_parking)
        .catch(err => console.log('[IA LINK] Clean state reset:', err));
    }

    let intervalId: NodeJS.Timeout;

    const pollLatestEvent = async () => {
      try {
        const response = await bookingApi.getLatestBarrierEvent(selectedParking.id_parking);
        
        if (response.has_event && response.event) {
          const event = response.event;
          
          // First load of auto-sync: capture the current latest log timestamp but do not open the barrier for old history
          if (lastEventTimestamp === null) {
            setLastEventTimestamp(event.timestamp);
            return;
          }

          // A brand new entry/exit log has been registered!
          if (event.timestamp !== lastEventTimestamp) {
            setLastEventTimestamp(event.timestamp);
            
            // Auto fill license plate for visual confirmation
            setLicensePlate(event.license_plate);
            
            addLog(`[SENSOR IA] ¡Acceso remoto detectado! Patente: "${event.license_plate.toUpperCase()}"`);
            
            // Open barrier
            setBarrierState('open');
            addLog(`[APROBADO] ${event.action === 'check-in' ? 'Ingreso' : 'Salida'} registrado en la base de datos.`);
            addLog('[FÍSICO] Motor activado por IoT. Abriendo barrera...');
            
            animateBarrier(1, () => {
              addLog('[FÍSICO] Barrera totalmente ABIERTA por IA.');
              triggerAutoClose();
            });
          }
        }
      } catch (error) {
        console.error('Error polling barrier events:', error);
      }
    };

    // Run immediately on enable
    pollLatestEvent();

    // Poll every 2 seconds
    intervalId = setInterval(pollLatestEvent, 2000);

    return () => {
      clearInterval(intervalId);
    };
  }, [autoSync, selectedParking, lastEventTimestamp, barrierState]);

  const fetchParkings = async () => {
    try {
      const data = await parkingApi.getParkings();
      setParkings(data);
      if (data.length > 0) {
        setSelectedParking(data[0]);
      }
    } catch (error) {
      console.error('Error fetching parkings:', error);
      addLog('[ERROR] No se pudieron cargar las cocheras.');
    }
  };

  const fetchVehicles = async () => {
    try {
      const data = await vehicleApi.getVehicles();
      setVehicles(data);
    } catch (error) {
      console.error('Error fetching vehicles:', error);
    }
  };

  const addLog = (message: string) => {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setLogs(prev => [`[${time}] ${message}`, ...prev.slice(0, 19)]);
  };

  // Animate barrier opening/closing
  const animateBarrier = (targetValue: number, callback?: () => void) => {
    Animated.timing(barrierRotation, {
      toValue: targetValue,
      duration: 1200,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1.0),
      useNativeDriver: true
    }).start(callback);
  };

  // Perform plate check and trigger barrier action
  const handleCheckPlate = async () => {
    if (!selectedParking) {
      Alert.alert('Cochera Requerida', 'Por favor, selecciona una cochera para simular la barrera.');
      return;
    }
    if (!licensePlate.trim()) {
      Alert.alert('Patente Requerida', 'Por favor, ingresa una patente manualmente o selecciona un vehículo rápido.');
      return;
    }

    setLoading(true);
    addLog(`[LECTOR CÁMARA] Patente detectada: "${licensePlate.toUpperCase()}" en ${selectedParking.name}`);
    addLog('[SISTEMA] Consultando reservas en el servidor...');

    try {
      const response = await bookingApi.checkBarrierPlate(selectedParking.id_parking, licensePlate);
      
      if (response.status === 'allowed') {
        setLoading(false);
        addLog(`[APROBADO] ${response.message}`);
        
        // Open barrier
        setBarrierState('open');
        addLog('[FÍSICO] Motor activado. Abriendo barrera...');
        animateBarrier(1, () => {
          addLog('[FÍSICO] Barrera totalmente ABIERTA. Vehículo puede pasar.');
          
          // Trigger auto-close mechanism after 6 seconds
          triggerAutoClose();
        });
      } else {
        setLoading(false);
        addLog(`[RECHAZADO] ${response.message}`);
        Alert.alert('Acceso Denegado', response.message);
      }
    } catch (error: any) {
      setLoading(false);
      const errMsg = error.message || 'Error de conexión';
      addLog(`[ERROR] Fallo en la comunicación: ${errMsg}`);
      Alert.alert('Error', errMsg);
    }
  };

  const triggerAutoClose = () => {
    if (countdownTimer.current) clearInterval(countdownTimer.current);
    
    let countdown = 6;
    setAutoCloseCountdown(countdown);
    
    countdownTimer.current = setInterval(() => {
      countdown -= 1;
      setAutoCloseCountdown(countdown);
      
      if (countdown <= 0) {
        if (countdownTimer.current) clearInterval(countdownTimer.current);
        setAutoCloseCountdown(null);
        
        addLog('[SISTEMA] Sensor de paso detectado. Iniciando cierre automático...');
        animateBarrier(0, () => {
          addLog('[FÍSICO] Barrera totalmente CERRADA. Canal bloqueado.');
          setBarrierState('closed');
          // Reset backend barrier lock state so the AI can scan the next vehicle
          if (selectedParking) {
            bookingApi.resetBarrierState(selectedParking.id_parking)
              .then(() => {
                addLog('[IA LINK] Backend desbloqueado. Listo para nueva lectura.');
              })
              .catch(err => {
                console.error('Error resetting barrier state:', err);
              });
          }
        });
      }
    }, 1000);
  };

  // Interpolations for animated rotation of the barrier arm
  const rotateArm = barrierRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '90deg']
  });

  return (
    <SafeAreaView style={styles.container}>
      {/* Floating Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => {
          if (countdownTimer.current) clearInterval(countdownTimer.current);
          navigation.goBack();
        }}>
          <Ionicons name="chevron-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Simulador de Barrera</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        
        {/* Visual Barrier Simulation Area */}
        <View style={styles.simulationCard}>
          <Text style={styles.sectionLabel}>ESTADO DE CANAL DE INGRESO / EGRESO</Text>
          
          <View style={styles.visualizerContainer}>
            {/* Flashing Status Light Indicator on the Left Pole */}
            <View style={styles.lightPole}>
              <Animated.View style={[
                styles.statusLight,
                {
                  backgroundColor: barrierState === 'open' ? '#00E676' : '#FF1744',
                  shadowColor: barrierState === 'open' ? '#00E676' : '#FF1744',
                  opacity: pulseAnim
                }
              ]} />
              <View style={styles.poleSteel} />
            </View>

            {/* Cabinet and Hinge on the Right */}
            <View style={styles.barrierBase}>
              <View style={styles.hingeDot} />
            </View>

            {/* Animated Barrier Arm spanning the road from Right to Left */}
            <Animated.View style={[
              styles.barrierArm,
              {
                transform: [
                  { translateX: 90 }, // Shift pivot point (half of width 180) to the right-hand edge
                  { rotate: rotateArm },
                  { translateX: -90 }
                ]
              }
            ]}>
              <View style={styles.armStripeWhite} />
              <View style={styles.armStripeRed} />
              <View style={styles.armStripeWhite} />
              <View style={styles.armStripeRed} />
              <View style={styles.armStripeWhite} />
            </Animated.View>

            {/* Centered Road surface line */}
            <View style={styles.roadLine} />
          </View>

          {/* Glowing Status Badge */}
          <View style={styles.badgeRow}>
            <View style={[
              styles.statusBadge,
              { borderColor: barrierState === 'open' ? 'rgba(0, 230, 118, 0.4)' : 'rgba(255, 23, 68, 0.4)' }
            ]}>
              <View style={[
                styles.badgeDot,
                { backgroundColor: barrierState === 'open' ? '#00E676' : '#FF1744' }
              ]} />
              <Text style={[
                styles.badgeText,
                { color: barrierState === 'open' ? '#00E676' : '#FF1744' }
              ]}>
                BARRERA {barrierState === 'open' ? 'ABIERTA' : 'CERRADA'}
              </Text>
            </View>
            
            {autoCloseCountdown !== null && (
              <View style={styles.countdownBadge}>
                <Ionicons name="car-outline" size={14} color="#00f2fe" style={{ marginRight: 5 }} />
                <Text style={styles.countdownText}>Pasando... {autoCloseCountdown}s</Text>
              </View>
            )}
          </View>
        </View>

        {/* Real-time AI Sync Toggle Option */}
        <View style={[
          styles.syncCard,
          autoSync && styles.syncCardActive
        ]}>
          <View style={styles.syncRow}>
            <View style={styles.syncTextWrapper}>
              <View style={styles.syncHeaderRow}>
                <Ionicons 
                  name={autoSync ? "radio-button-on" : "radio-button-off"} 
                  size={20} 
                  color={autoSync ? "#00E676" : "rgba(255,255,255,0.4)"} 
                  style={{ marginRight: 8 }} 
                />
                <Text style={styles.syncTitle}>VINCULAR CÁMARA IA</Text>
              </View>
              <Text style={styles.syncSubtitle}>
                {autoSync 
                  ? "Escuchando lecturas de patentes en tiempo real..." 
                  : "Conecta la barrera con la IA física de tu computadora"
                }
              </Text>
            </View>
            <TouchableOpacity 
              style={[
                styles.syncToggle,
                autoSync ? styles.syncToggleOn : styles.syncToggleOff
              ]} 
              onPress={() => {
                setAutoSync(!autoSync);
                setLastEventTimestamp(null); // Reset to fetch fresh events
                addLog(`[AUTO-SYNC] Modo automático ${!autoSync ? 'HABILITADO 📡' : 'DESHABILITADO 📴'}`);
              }}
            >
              <View style={[
                styles.syncToggleThumb,
                autoSync ? styles.syncToggleThumbOn : styles.syncToggleThumbOff
              ]} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Configuration Panel */}
        <View style={styles.controlPanelCard}>
          {/* Cochera Selector */}
          <Text style={styles.inputTitle}>1. Cochera Física de Control</Text>
          {parkings.length === 0 ? (
            <ActivityIndicator color={theme.colors.primary} style={{ marginVertical: 10 }} />
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.parkingList}>
              {parkings.map((p) => {
                const isSelected = selectedParking?.id_parking === p.id_parking;
                return (
                  <TouchableOpacity
                    key={p.id_parking}
                    style={[styles.parkingPill, isSelected && styles.parkingPillActive]}
                    onPress={() => {
                      setSelectedParking(p);
                      addLog(`[COCHERA] Cambiado canal a: "${p.name}"`);
                    }}
                  >
                    <Ionicons name="business" size={14} color={isSelected ? '#000' : '#8a9ab0'} style={{ marginRight: 6 }} />
                    <Text style={[styles.parkingPillText, isSelected && styles.parkingPillTextActive]}>
                      {p.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          {/* Patente input */}
          <Text style={styles.inputTitle}>2. Identificación de Vehículo (Patente)</Text>
          <View style={styles.plateInputContainer}>
            <Ionicons name="card-outline" size={20} color="rgba(255,255,255,0.4)" style={styles.inputIcon} />
            <TextInput
              style={styles.plateInput}
              placeholder="Ej: AE123PX o AA123BB"
              placeholderTextColor="rgba(255,255,255,0.3)"
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={9}
              value={licensePlate}
              onChangeText={setLicensePlate}
            />
            {licensePlate.length > 0 && (
              <TouchableOpacity onPress={() => setLicensePlate('')} style={styles.clearBtn}>
                <Ionicons name="close-circle" size={18} color="rgba(255,255,255,0.4)" />
              </TouchableOpacity>
            )}
          </View>

          {/* My vehicles shortcuts */}
          {vehicles.length > 0 && (
            <View style={styles.shortcutWrapper}>
              <Text style={styles.shortcutLabel}>Vehículos en tu perfil (Acceso rápido):</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.shortcutList}>
                {vehicles.map((v) => (
                  <TouchableOpacity
                    key={v.id_vehicle}
                    style={styles.shortcutCard}
                    onPress={() => {
                      setLicensePlate(v.license_plate);
                      addLog(`[SHORTCUT] Cargada patente: "${v.license_plate}" (${v.model})`);
                    }}
                  >
                    <Ionicons name="car-sport-outline" size={14} color={theme.colors.primary} style={{ marginRight: 6 }} />
                    <View>
                      <Text style={styles.shortcutPlate}>{v.license_plate}</Text>
                      <Text style={styles.shortcutModel}>{v.model}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Submit Trigger Button */}
          <TouchableOpacity
            style={[styles.validateBtn, loading && styles.validateBtnDisabled]}
            onPress={handleCheckPlate}
            disabled={loading}
          >
            <LinearGradient
              colors={['#00f2fe', '#4facfe']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gradientBtn}
            >
              {loading ? (
                <ActivityIndicator color="#000" size="small" />
              ) : (
                <>
                  <Ionicons name="scan-circle" size={22} color="#000" style={{ marginRight: 8 }} />
                  <Text style={styles.validateBtnText}>SIMULAR LECTURA CÁMARA</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Live Terminal Log Panel */}
        <View style={styles.consoleCard}>
          <View style={styles.consoleHeader}>
            <View style={styles.consoleIndicators}>
              <View style={[styles.indicatorCircle, { backgroundColor: '#FF5F56' }]} />
              <View style={[styles.indicatorCircle, { backgroundColor: '#FFBD2E' }]} />
              <View style={[styles.indicatorCircle, { backgroundColor: '#27C93F' }]} />
            </View>
            <Text style={styles.consoleTitle}>CONSOLA DE MONITOREO LPR (IoT)</Text>
          </View>
          <View style={styles.consoleBody}>
            {logs.map((log, idx) => {
              let textStyle = styles.logText;
              if (log.includes('[ERROR]')) textStyle = styles.logError;
              else if (log.includes('[APROBADO]')) textStyle = styles.logApproved;
              else if (log.includes('[RECHAZADO]')) textStyle = styles.logDenied;
              else if (log.includes('[LECTOR')) textStyle = styles.logReader;

              return (
                <Text key={idx} style={textStyle}>
                  {log}
                </Text>
              );
            })}
          </View>
        </View>

      </ScrollView>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  scrollContainer: {
    padding: 16,
    gap: 16,
  },
  syncCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    padding: 16,
  },
  syncCardActive: {
    backgroundColor: 'rgba(0, 230, 118, 0.04)',
    borderColor: 'rgba(0, 230, 118, 0.25)',
  },
  syncRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  syncTextWrapper: {
    flex: 1,
    paddingRight: 12,
  },
  syncHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  syncTitle: {
    color: 'white',
    fontSize: 13,
    fontWeight: 'bold',
    letterSpacing: 1.0,
  },
  syncSubtitle: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
    lineHeight: 14,
  },
  syncToggle: {
    width: 50,
    height: 28,
    borderRadius: 14,
    padding: 2,
    justifyContent: 'center',
  },
  syncToggleOn: {
    backgroundColor: '#00E676',
  },
  syncToggleOff: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  syncToggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  syncToggleThumbOn: {
    alignSelf: 'flex-end',
  },
  syncToggleThumbOff: {
    alignSelf: 'flex-start',
  },
  simulationCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    padding: 20,
  },
  sectionLabel: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1.5,
    marginBottom: 20,
    textAlign: 'center',
  },
  visualizerContainer: {
    height: 140,
    width: 280,
    alignSelf: 'center',
    marginVertical: 10,
    position: 'relative',
    overflow: 'hidden',
  },
  lightPole: {
    position: 'absolute',
    left: 20,
    bottom: 0,
    width: 20,
    alignItems: 'center',
  },
  statusLight: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'white',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 8,
  },
  poleSteel: {
    width: 4,
    height: 90,
    backgroundColor: '#475569',
    borderRadius: 2,
  },
  barrierBase: {
    position: 'absolute',
    right: 20,
    bottom: 0,
    width: 32,
    height: 56,
    backgroundColor: '#1e293b',
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  barrierArm: {
    position: 'absolute',
    right: 32, // pivot starts exactly at the cabinet's left edge
    bottom: 30, // perfect vertical alignment with the hinge dot
    width: 180, // perfectly spans the gap to the pole
    height: 8,
    backgroundColor: '#f1c40f',
    borderRadius: 4,
    flexDirection: 'row',
    justifyContent: 'space-around',
    overflow: 'hidden',
    zIndex: 4,
  },
  armStripeWhite: {
    width: 20,
    height: '100%',
    backgroundColor: 'white',
  },
  armStripeRed: {
    width: 20,
    height: '100%',
    backgroundColor: '#e74c3c',
  },
  hingeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#00f2fe',
    shadowColor: '#00f2fe',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 5,
  },
  roadLine: {
    height: 4,
    backgroundColor: '#334155',
    position: 'absolute',
    bottom: 0,
    left: 10,
    right: 10,
    borderRadius: 2,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginTop: 20,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  badgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  countdownBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 242, 254, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0, 242, 254, 0.2)',
  },
  countdownText: {
    color: '#00f2fe',
    fontSize: 11,
    fontWeight: 'bold',
  },
  controlPanelCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    padding: 20,
    gap: 12,
  },
  inputTitle: {
    color: 'white',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 4,
  },
  parkingList: {
    gap: 8,
    paddingVertical: 4,
  },
  parkingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  parkingPillActive: {
    backgroundColor: '#00f2fe',
    borderColor: 'rgba(0, 242, 254, 0.5)',
  },
  parkingPillText: {
    color: '#8a9ab0',
    fontSize: 12,
    fontWeight: '600',
  },
  parkingPillTextActive: {
    color: '#000',
    fontWeight: 'bold',
  },
  plateInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    height: 52,
    paddingHorizontal: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  plateInput: {
    flex: 1,
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  clearBtn: {
    padding: 4,
  },
  shortcutWrapper: {
    gap: 8,
    marginTop: 4,
  },
  shortcutLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
  },
  shortcutList: {
    gap: 8,
  },
  shortcutCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  shortcutPlate: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  shortcutModel: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 10,
  },
  validateBtn: {
    borderRadius: 16,
    height: 50,
    overflow: 'hidden',
    marginTop: 8,
    shadowColor: '#00f2fe',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
  },
  validateBtnDisabled: {
    opacity: 0.6,
  },
  gradientBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  validateBtnText: {
    color: '#000',
    fontSize: 13,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  consoleCard: {
    backgroundColor: '#05070f',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  consoleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.02)',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  consoleIndicators: {
    flexDirection: 'row',
    gap: 6,
    marginRight: 16,
  },
  indicatorCircle: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  consoleTitle: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1.0,
  },
  consoleBody: {
    padding: 16,
    height: 200,
    gap: 6,
  },
  logText: {
    color: '#a0aec0',
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    fontSize: 11,
    lineHeight: 14,
  },
  logError: {
    color: '#e74c3c',
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    fontSize: 11,
    fontWeight: 'bold',
  },
  logApproved: {
    color: '#2ecc71',
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    fontSize: 11,
    fontWeight: 'bold',
  },
  logDenied: {
    color: '#f39c12',
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    fontSize: 11,
    fontWeight: 'bold',
  },
  logReader: {
    color: '#00f2fe',
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    fontSize: 11,
  }
});
