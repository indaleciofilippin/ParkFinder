import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Animated,
  Easing,
  ActivityIndicator,
  Alert,
  Dimensions,
  Platform,
  TextStyle
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../../theme/theme';
import { parkingApi, vehicleApi, bookingApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import * as ImagePicker from 'expo-image-picker';
import { CameraView, useCameraPermissions } from 'expo-camera';

const { width } = Dimensions.get('window');

export const BarrierSimulatorScreen = ({ navigation }: any) => {
  const { user } = useAuth();

  const showAlert = (title: string, message: string) => {
    if (Platform.OS === 'web') {
      alert(`${title}: ${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  // State
  const [parkings, setParkings] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [selectedParking, setSelectedParking] = useState<any>(null);
  const [licensePlate, setLicensePlate] = useState('');
  const [loading, setLoading] = useState(false);
  const [barrierState, setBarrierState] = useState<'closed' | 'open'>('closed');
  const [logs, setLogs] = useState<string[]>(['[SISTEMA] Listo. Selecciona una cochera e ingresa una patente.']);
  const [autoCloseCountdown, setAutoCloseCountdown] = useState<number | null>(null);
  const [autoSync, setAutoSync] = useState(true);
  const [lastEventTimestamp, setLastEventTimestamp] = useState<string | null>(null);
  const [scanningPlate, setScanningPlate] = useState(false);
  const [isMirrored, setIsMirrored] = useState(Platform.OS === 'web');

  // Real-time Camera Scanner states
  const [realtimeCameraActive, setRealtimeCameraActive] = useState(false);
  const [isProcessingFrame, setIsProcessingFrame] = useState(false);
  const [scanCooldown, setScanCooldown] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<any>(null);

  // Animated values
  const barrierRotation = useRef(new Animated.Value(0)).current; // 0 for closed (0 deg), 1 for open (-90 deg)
  const pulseAnim = useRef(new Animated.Value(0.4)).current;
  const countdownTimer = useRef<any | null>(null);

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

  const [laserAnim] = useState(new Animated.Value(0));

  // Laser scanner animation loop
  useEffect(() => {
    if (realtimeCameraActive && isProcessingFrame && !scanCooldown) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(laserAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.ease)
          }),
          Animated.timing(laserAnim, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.ease)
          })
        ])
      ).start();
    } else {
      laserAnim.setValue(0);
    }
  }, [realtimeCameraActive, isProcessingFrame, scanCooldown]);

  // Real-time camera scanning loop (every 2 seconds)
  useEffect(() => {
    if (!realtimeCameraActive || scanCooldown || isProcessingFrame || !selectedParking || barrierState === 'open') {
      return;
    }

    const interval = setInterval(async () => {
      if (isProcessingFrame || scanCooldown || !cameraRef.current) return;

      try {
        setIsProcessingFrame(true);
        addLog('[LECTOR IA] Capturando fotograma de cámara en vivo...');

        // Take a picture silently (high compression)
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.3,
          skipProcessing: true,
        });

        if (photo && photo.uri) {
          addLog('[LECTOR IA] Analizando fotograma en microservicio de IA...');
          const response = await bookingApi.scanBarrierPlateImage(photo.uri, isMirrored);

          if (response.success && response.plate) {
            const detectedPlate = response.plate.toUpperCase();
            setLicensePlate(detectedPlate);
            addLog(`[LECTOR IA] ¡Patente detectada automáticamente!: "${detectedPlate}"`);

            // Pause scanning during validation
            setScanCooldown(true);

            // Check plate and open barrier. We skip the cooldown check inside the function since we just activated it.
            const success = await handleCheckPlate(detectedPlate, true);

            if (success) {
              // Hold scanning for 8 seconds to allow the car to pass and barrier to close
              setTimeout(() => {
                setScanCooldown(false);
                addLog('[LECTOR IA] Reanudando escaneo en tiempo real.');
              }, 8000);
            } else {
              // Rejected! Just wait 3 seconds before trying another scan to avoid spamming the same rejected plate
              setTimeout(() => {
                setScanCooldown(false);
                addLog('[LECTOR IA] Listo para leer siguiente patente.');
              }, 3000);
            }
          } else {
            addLog('[LECTOR IA] No se detectaron patentes en el fotograma actual.');
          }
        }
      } catch (err: any) {
        console.error('[REALTIME CAMERA ERROR]', err);
        addLog(`[LECTOR IA ERROR] Error al escanear fotograma: ${err.message || err}`);
      } finally {
        setIsProcessingFrame(false);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [realtimeCameraActive, scanCooldown, isProcessingFrame, selectedParking, barrierState]);

  const toggleRealtimeCamera = async () => {
    if (!selectedParking) {
      showAlert('Cochera Requerida', 'Por favor, selecciona una cochera antes de activar la cámara.');
      return;
    }

    if (!realtimeCameraActive) {
      if (!permission?.granted) {
        const res = await requestPermission();
        if (!res.granted) {
          showAlert('Permiso Requerido', 'Debes permitir el acceso a la cámara para usar el escáner en tiempo real.');
          return;
        }
      }
      setRealtimeCameraActive(true);
      setScanCooldown(false);
      addLog('[LECTOR IA] Escáner en tiempo real HABILITADO 🎥');
    } else {
      setRealtimeCameraActive(false);
      addLog('[LECTOR IA] Escáner en tiempo real DESHABILITADO 🛑');
    }
  };

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

    let intervalId: any;

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

    // Poll every 1.5 seconds (1500 ms)
    intervalId = setInterval(pollLatestEvent, 1500);

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

  const handleScanPlate = async () => {
    if (!selectedParking) {
      Alert.alert('Cochera Requerida', 'Por favor, selecciona una cochera para poder escanear.');
      return;
    }

    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        showAlert(
          'Permiso Denegado',
          'Se requiere acceso a la cámara para poder tomar una foto y leer la patente de forma automática.'
        );
        addLog('[LECTOR IA] Permiso de cámara denegado.');
        return;
      }

      addLog('[LECTOR IA] Levantando cámara del dispositivo móvil...');
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        addLog('[LECTOR IA] Captura cancelada por el usuario.');
        return;
      }

      setScanningPlate(true);
      addLog('[LECTOR IA] Foto capturada con éxito. Enviando imagen al servidor...');

      const imageUri = result.assets[0].uri;
      const response = await bookingApi.scanBarrierPlateImage(imageUri);

      if (response.success && response.plate) {
        const detectedPlate = response.plate.toUpperCase();
        setLicensePlate(detectedPlate);
        addLog(`[LECTOR IA] Patente identificada exitosamente: "${detectedPlate}"`);
        showAlert('Patente Detectada', `Se ha leído la patente "${detectedPlate}" con éxito.`);
      } else {
        addLog('[ERROR] No se detectó ninguna patente en la imagen. Intenta encuadrarla mejor.');
        showAlert('Lectura Fallida', 'No se pudo detectar ninguna patente en la imagen. Asegúrate de enfocar bien la patente del vehículo.');
      }
    } catch (err: any) {
      console.error('[IA SCAN ERROR]', err);
      const errMsg = err.message || 'Error desconocido';
      addLog(`[ERROR] Fallo al procesar escaneo: ${errMsg}`);
      showAlert('Error de Escaneo', `Ocurrió un error al enviar la imagen para procesar: ${errMsg}`);
    } finally {
      setScanningPlate(false);
    }
  };

  // Perform plate check and trigger barrier action
  const handleCheckPlate = async (overridePlate?: string, skipCooldownCheck = false): Promise<boolean> => {
    if (barrierState === 'open' || loading || (!skipCooldownCheck && scanCooldown)) {
      return false;
    }
    if (!selectedParking) {
      showAlert('Cochera Requerida', 'Por favor, selecciona una cochera para simular la barrera.');
      return false;
    }
    const plateToCheck = overridePlate || licensePlate;
    if (!plateToCheck.trim()) {
      showAlert('Patente Requerida', 'Por favor, ingresa una patente manualmente o selecciona un vehículo rápido.');
      return false;
    }

    setLoading(true);
    addLog(`[LECTOR CÁMARA] Patente detectada: "${plateToCheck.toUpperCase()}" en ${selectedParking.name}`);
    addLog('[SISTEMA] Consultando reservas en el servidor...');

    try {
      const response = await bookingApi.checkBarrierPlate(selectedParking.id_parking, plateToCheck);

      if (response.status === 'allowed') {
        setLoading(false);
        addLog(`[APROBADO] ${response.message}`);

        // Show checkout payment breakdown if applicable
        if (response.action === 'check-out' && response.total_charged != null) {
          const total: number = response.total_charged;
          showAlert(
            'Salida Autorizada',
            `Total cobrado automáticamente a la tarjeta vinculada: $${total.toFixed(2)}`
          );
        }

        // Open barrier
        setBarrierState('open');
        addLog('[FÍSICO] Motor activado. Abriendo barrera...');
        
        // Silently sync the latest event timestamp to prevent the polling interval from triggering a duplicate open
        bookingApi.getLatestBarrierEvent(selectedParking.id_parking).then(res => {
          if (res.has_event && res.event) {
            setLastEventTimestamp(res.event.timestamp);
          }
        }).catch(err => console.log('Silencing sync error', err));

        animateBarrier(1, () => {
          addLog('[FÍSICO] Barrera totalmente ABIERTA. Vehículo puede pasar.');

          // Trigger auto-close mechanism after 6 seconds
          triggerAutoClose();
        });
        return true;
      } else {
        setLoading(false);
        addLog(`[RECHAZADO] ${response.message}`);
        showAlert('Acceso Denegado', response.message);
        return false;
      }
    } catch (error: any) {
      setLoading(false);
      const errMsg = error.message || 'Error de conexión';
      addLog(`[ERROR] Fallo en la comunicación: ${errMsg}`);
      showAlert('Error', errMsg);
      return false;
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

        {/* Real-time Camera Preview Viewfinder */}
        {realtimeCameraActive && (
          <View style={styles.cameraCard}>
            <View style={styles.cameraCardHeader}>
              <Ionicons name="scan-outline" size={16} color="#00f2fe" style={{ marginRight: 6 }} />
              <Text style={styles.cameraSectionLabel}>ESCANEO DE PATENTE EN VIVO (IA)</Text>
            </View>
            <View style={styles.cameraContainer}>
              <View style={[StyleSheet.absoluteFillObject, { transform: [{ scaleX: isMirrored ? -1 : 1 }] }]}>
                <CameraView
                  style={StyleSheet.absoluteFillObject}
                  ref={cameraRef}
                  facing="back"
                />
              </View>
              {/* Target guidelines frame */}
              <View style={styles.scannerOverlay}>
                <View style={styles.scanTargetBox}>
                  <View style={[styles.corner, styles.cornerTL]} />
                  <View style={[styles.corner, styles.cornerTR]} />
                  <View style={[styles.corner, styles.cornerBL]} />
                  <View style={[styles.corner, styles.cornerBR]} />
                  {isProcessingFrame && !scanCooldown && (
                    <Animated.View style={[
                      styles.laserScanLine,
                      {
                        transform: [{
                          translateY: laserAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0, 120]
                          })
                        }]
                      }
                    ]} />
                  )}
                </View>
                <Text style={styles.cameraInstructions}>
                  {barrierState === 'open'
                    ? "⏱️ Vehículo pasando... Barrera abierta"
                    : scanCooldown
                      ? "⏱️ Procesando / Pausa de seguridad..."
                      : isProcessingFrame
                        ? "⚡ Analizando patente..."
                        : "Apunta el recuadro a la patente del vehículo"}
                </Text>
              </View>
            </View>
          </View>
        )}



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
            {licensePlate.length > 0 ? (
              <TouchableOpacity onPress={() => setLicensePlate('')} style={styles.clearBtn}>
                <Ionicons name="close-circle" size={18} color="rgba(255,255,255,0.4)" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={handleScanPlate}
                style={styles.clearBtn}
                disabled={scanningPlate || loading || barrierState === 'open'}
              >
                {scanningPlate ? (
                  <ActivityIndicator size="small" color="#00f2fe" />
                ) : (
                  <Ionicons name="camera-outline" size={20} color="#00f2fe" />
                )}
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

          {/* Cámara Scan Button */}
          <TouchableOpacity
            style={styles.scanCameraBtn}
            onPress={toggleRealtimeCamera}
          >
            <LinearGradient
              colors={realtimeCameraActive ? ['#ff4e50', '#f9d423'] : ['#8a2be2', '#da70d6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gradientBtn}
            >
              <Ionicons
                name={realtimeCameraActive ? "stop-circle" : "camera"}
                size={22}
                color="#fff"
                style={{ marginRight: 8 }}
              />
              <Text style={styles.scanCameraBtnText}>
                {realtimeCameraActive ? "DESACTIVAR CÁMARA EN VIVO" : "ACTIVAR CÁMARA EN VIVO (IA REALTIME)"}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Submit Trigger Button */}
          <TouchableOpacity
            style={[styles.validateBtn, (loading || barrierState === 'open') && styles.validateBtnDisabled]}
            onPress={() => handleCheckPlate()}
            disabled={loading || barrierState === 'open'}
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
              let textStyle: TextStyle = styles.logText;
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
  scanCameraBtn: {
    borderRadius: 16,
    height: 50,
    overflow: 'hidden',
    marginTop: 8,
    shadowColor: '#da70d6',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
  },
  scanCameraBtnDisabled: {
    opacity: 0.6,
  },
  scanCameraBtnText: {
    color: '#fff',
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
    lineHeight: 14,
  },
  logApproved: {
    color: '#2ecc71',
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    fontSize: 11,
    fontWeight: 'bold',
    lineHeight: 14,
  },
  logDenied: {
    color: '#f39c12',
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    fontSize: 11,
    fontWeight: 'bold',
    lineHeight: 14,
  },
  logReader: {
    color: '#00f2fe',
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    fontSize: 11,
    lineHeight: 14,
  },
  cameraCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    padding: 20,
    gap: 12,
  },
  cameraCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  cameraSectionLabel: {
    color: '#8a9ab0',
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 0.8,
  },
  cameraContainer: {
    height: 240,
    borderRadius: 18,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(0, 242, 254, 0.15)',
  },
  scannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanTargetBox: {
    width: 220,
    height: 120,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  laserScanLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 2,
    backgroundColor: '#00f2fe',
    shadowColor: '#00f2fe',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  cameraInstructions: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 14,
    overflow: 'hidden',
  },
  corner: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderColor: '#00f2fe',
  },
  cornerTL: {
    top: -2,
    left: -2,
    borderTopWidth: 3,
    borderLeftWidth: 3,
  },
  cornerTR: {
    top: -2,
    right: -2,
    borderTopWidth: 3,
    borderRightWidth: 3,
  },
  cornerBL: {
    bottom: -2,
    left: -2,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
  },
  cornerBR: {
    bottom: -2,
    right: -2,
    borderBottomWidth: 3,
    borderRightWidth: 3,
  }
});
