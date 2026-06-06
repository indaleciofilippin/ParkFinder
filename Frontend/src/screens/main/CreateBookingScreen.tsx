import React, { useEffect, useState, useCallback } from 'react';
import { CommonActions } from '@react-navigation/native';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Dimensions, Platform, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { WebView } from 'react-native-webview';
import { theme } from '../../theme/theme';
import { vehicleApi, bookingApi } from '../../services/api';
import { i18n } from '../../i18n';
import DateTimePicker from '@react-native-community/datetimepicker';
import { formatCurrency } from '../../utils/formatters';

const { width } = Dimensions.get('window');

export const CreateBookingScreen = ({ navigation, route }: any) => {
  const { parking } = route.params;
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Arrival Time state (The only one that matters for the user)
  const [arrivalTime, setArrivalTime] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);

  // Payment Form States (Pre-populated for fast simulation/testing)
  const [cardNumber, setCardNumber] = useState('4509953566233704'); // Tarjeta de prueba Visa Argentina aprobada por Mercado Pago
  const [expMonth, setExpMonth] = useState('11');
  const [expYear, setExpYear] = useState('30');
  const [cvv, setCvv] = useState('123');
  const [cardholderName, setCardholderName] = useState('APRO');
  const [documentNumber, setDocumentNumber] = useState('12345678');

  const onTimeChange = (event: any, selectedDate?: Date) => {
    setShowPicker(Platform.OS === 'ios');
    if (selectedDate) {
      setArrivalTime(selectedDate);
    }
  };

  const [savedPaymentInfo, setSavedPaymentInfo] = useState<{ has_saved_card: boolean, payment_method_id?: string, last_four?: string } | null>(null);
  const [rebillToken, setRebillToken] = useState<string | null>(null);
  useEffect(() => {
    fetchVehicles();
    fetchSavedPaymentInfo();
    if (parking.categories && parking.categories.length > 0) {
      setSelectedCategory(parking.categories[0]);
    }
  }, [parking.categories]);

  // Escuchar mensajes del iframe de Rebill en Web
  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const handleWebMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'ERROR') {
          Alert.alert('Error de Tarjeta', data.error);
        } else if (data.type === 'SUCCESS') {
          const finalToken = data.token || data.raw?.id || data.raw?.token?.id || data.raw?.card?.id || 'rebill_token_placeholder';
          setRebillToken(finalToken);
        }
      } catch (e) {
        // Ignorar mensajes no válidos o que no provengan del formulario
      }
    };

    window.addEventListener('message', handleWebMessage);
    return () => window.removeEventListener('message', handleWebMessage);
  }, []);

  const fetchSavedPaymentInfo = async () => {
    try {
      const data = await bookingApi.getSavedPaymentMethod();
      setSavedPaymentInfo(data);
    } catch (error) {
      console.error('Error fetching saved payment info:', error);
    }
  };

  const fetchVehicles = async () => {
    try {
      const data = await vehicleApi.getVehicles();
      setVehicles(data);
      if (data.length > 0) {
        setSelectedVehicle(data[0].id_vehicle);
      }
    } catch (error) {
      console.error('Error fetching vehicles:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateBooking = async () => {
    if (!selectedVehicle || !selectedCategory) {
      Alert.alert('Error', 'Por favor selecciona un vehículo y categoría');
      return;
    }

    const hasSavedCard = savedPaymentInfo?.has_saved_card;

    if (!hasSavedCard && !rebillToken) {
      Alert.alert('Error', 'Por favor ingresa y guarda tu tarjeta en el formulario antes de confirmar.');
      return;
    }

    setIsSubmitting(true);
    try {
      let token = "use_saved_card";
      let method = "visa";

      if (!hasSavedCard && rebillToken) {
        token = rebillToken;
      } else if (savedPaymentInfo) {
        method = savedPaymentInfo.payment_method_id || "visa";
      }

      // 2. Default end time buffer (+2h)
      const defaultDuration = 2; // 2 hours buffer
      const departureTime = new Date(arrivalTime.getTime() + defaultDuration * 60 * 60 * 1000);

      // 3. Send Booking Request with token
      await bookingApi.createBooking({
        id_vehicle: selectedVehicle,
        id_parking: parking.id_parking,
        id_category: selectedCategory.id_category,
        expected_start_time: arrivalTime.toISOString(),
        expected_end_time: departureTime.toISOString(),
        card_token: token,
        payment_method_id: method,
      });

      Alert.alert(
        'Reserva Confirmada',
        'Tu lugar está reservado. La barrera se abrirá automáticamente al detectar tu patente.',
        [{ text: 'Listo', onPress: () => navigation.dispatch(
            CommonActions.reset({
              index: 0,
              routes: [{ name: 'Home' }],
            })
          ) 
        }]
      );
    } catch (error: any) {
      const errorMsg = error.response?.data?.detail || error.message || 'No se pudo realizar la reserva';
      Alert.alert('Error', errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const setTimeQuickly = (minutesToAdd: number) => {
    const now = new Date();
    setArrivalTime(new Date(now.getTime() + minutesToAdd * 60000));
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  // Safe rates with multiple fallbacks
  const baseRate = Number(parking.base_hourly_rate || parking.base_rate || 0);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.title}>Confirmar Reserva</Text>
          <Text style={styles.subtitle}>{parking.name}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Summary Card - Professional & Clear */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <View style={styles.summaryIconContainer}>
              <Ionicons name="business" size={24} color={theme.colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.summaryName}>{parking.name || 'Cochera Seleccionada'}</Text>
              <Text style={styles.summaryAddress}>{parking.total_available} lugares libres ahora</Text>
            </View>
          </View>

          <View style={styles.summaryDivider} />

          <View style={styles.policyRow}>
            <View style={styles.policyItem}>
              <Ionicons name="time-outline" size={16} color={theme.colors.textSecondary} />
              <Text style={styles.policyText}>Llegada: {formatTime(arrivalTime)}</Text>
            </View>
            {new Date(arrivalTime.getTime() - 30 * 60000) > new Date() && (
              <View style={styles.policyItem}>
                <Ionicons name="shield-checkmark-outline" size={16} color="#24C6A5" />
                <Text style={styles.policyText}>Cancela gratis hasta: {formatTime(new Date(arrivalTime.getTime() - 30 * 60000))}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Arrival Section */}
        <Text style={styles.sectionHeader}>¿Cuándo llegas?</Text>
        <View style={styles.glassSection}>
          <TouchableOpacity style={styles.timeBox} onPress={() => setShowPicker(true)}>
            <Text style={styles.timeValue}>{formatTime(arrivalTime)}</Text>
            <Text style={styles.graceText}>* Tienes 10 min de cortesía después de esta hora.</Text>
            <View style={styles.editBadge}>
              <Ionicons name="pencil" size={10} color={theme.colors.primary} />
              <Text style={styles.editBadgeText}>Toca para cambiar</Text>
            </View>
          </TouchableOpacity>

          {showPicker && (
            Platform.OS === 'web' ? (
              <input
                type="time"
                value={`${arrivalTime.getHours().toString().padStart(2, '0')}:${arrivalTime.getMinutes().toString().padStart(2, '0')}`}
                onChange={(e) => {
                  const [hours, minutes] = e.target.value.split(':');
                  const newDate = new Date(arrivalTime);
                  newDate.setHours(parseInt(hours));
                  newDate.setMinutes(parseInt(minutes));
                  setArrivalTime(newDate);
                }}
                style={{
                  backgroundColor: 'rgba(255,255,255,0.08)',
                  color: 'white',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: '12px',
                  padding: '14px',
                  fontSize: '16px',
                  outline: 'none',
                  width: '100%',
                  marginTop: '10px',
                  boxSizing: 'border-box'
                }}
              />
            ) : (
              <DateTimePicker
                value={arrivalTime}
                mode="time"
                is24Hour={true}
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={onTimeChange}
                textColor="white"
              />
            )
          )}

          <View style={styles.quickOptions}>
            <View style={styles.optionRow}>
              {[0, 15, 30, 45].map((m) => (
                <TouchableOpacity
                  key={m}
                  style={[
                    styles.miniOption,
                    Math.abs(arrivalTime.getTime() - (new Date().getTime() + m * 60000)) < 120000 && styles.activeMiniOption
                  ]}
                  onPress={() => setTimeQuickly(m)}
                >
                  <Text style={[styles.optionText, Math.abs(arrivalTime.getTime() - (new Date().getTime() + m * 60000)) < 120000 && { color: theme.colors.primary, fontWeight: '800' }]}>
                    {m === 0 ? 'Ahora' : `+${m}m`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Vehicle Selection */}
        <Text style={styles.sectionHeader}>Vehículo</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.vehicleScroll} contentContainerStyle={{ paddingRight: 40 }}>
          {vehicles.map((v) => (
            <TouchableOpacity
              key={v.id_vehicle}
              style={[styles.vehicleCard, selectedVehicle === v.id_vehicle && styles.selectedVehicle]}
              onPress={() => setSelectedVehicle(v.id_vehicle)}
            >
              <View style={[styles.vIconContainer, selectedVehicle === v.id_vehicle && { backgroundColor: 'rgba(36, 198, 165, 0.2)' }]}>
                <Ionicons name="car" size={24} color={selectedVehicle === v.id_vehicle ? theme.colors.primary : 'rgba(255,255,255,0.4)'} />
              </View>
              <Text style={styles.vPlate}>{v.license_plate}</Text>
              <Text style={styles.vModel} numberOfLines={1}>{v.model}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Category Selection */}
        <Text style={styles.sectionHeader}>Tipo de lugar</Text>
        <View style={styles.categoriesGrid}>
          {parking.categories?.map((cat: any) => (
            <TouchableOpacity
              key={cat.id_category}
              style={[styles.catCard, selectedCategory?.id_category === cat.id_category && styles.selectedCat]}
              onPress={() => setSelectedCategory(cat)}
            >
              <View style={styles.catHeader}>
                <Ionicons
                  name={cat.name.toLowerCase().includes('moto') ? 'bicycle' : 'car'}
                  size={20}
                  color={selectedCategory?.id_category === cat.id_category ? 'white' : theme.colors.textSecondary}
                />
                <Text style={[styles.catPrice, selectedCategory?.id_category === cat.id_category && { color: 'white' }]}>
                  {formatCurrency(Math.round(baseRate * Number(cat.price_multiplier || 1)))}/h
                </Text>
              </View>
              <Text style={[styles.catName, selectedCategory?.id_category === cat.id_category && { color: 'white' }]}>{cat.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Payment Integration */}
        <Text style={styles.sectionHeader}>Medio de Pago</Text>

        {savedPaymentInfo?.has_saved_card ? (
          <View style={styles.glassSection}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
              <Ionicons name="shield-checkmark" size={20} color="#00E676" />
              <Text style={{ color: '#00E676', fontWeight: '800', fontSize: 13, marginLeft: 8, letterSpacing: 0.5 }}>TARJETA VINCULADA</Text>
            </View>

            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              paddingVertical: 14,
              paddingHorizontal: 18,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: 'rgba(255, 255, 255, 0.08)'
            }}>
              <View style={{
                width: 44, height: 30, borderRadius: 6,
                backgroundColor: 'rgba(0, 158, 227, 0.15)',
                justifyContent: 'center', alignItems: 'center', marginRight: 14
              }}>
                <Ionicons name="card" size={20} color="#009EE3" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 15 }}>
                  {savedPaymentInfo.payment_method_id?.toUpperCase()} •••• {savedPaymentInfo.last_four}
                </Text>
                <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 2 }}>
                  Cobro automático al salir del estacionamiento
                </Text>
              </View>
              <Ionicons name="lock-closed" size={16} color="rgba(255,255,255,0.3)" />
            </View>

            <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, marginTop: 10, textAlign: 'center' }}>
              Podés cambiar tu tarjeta desde tu Perfil
            </Text>
          </View>
        ) : (
          <View style={[styles.glassSection, { padding: 0, overflow: 'hidden' }]}>
            <View style={[styles.paymentHeader, { padding: 16 }]}>
              <Ionicons name="card" size={24} color="#009EE3" />
              <Text style={styles.paymentTitle}>Registrar tarjeta</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 10 }}>
              <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, flex: 1 }}>
                Ingresa tu tarjeta para el cobro automático. La información se procesa de forma segura mediante Rebill.
              </Text>
            </View>

            {rebillToken ? (
              <View style={{ padding: 20, alignItems: 'center', backgroundColor: 'rgba(36, 198, 165, 0.1)', borderRadius: 12, margin: 16 }}>
                <Ionicons name="checkmark-circle" size={48} color="#24C6A5" />
                <Text style={{ color: 'white', fontSize: 18, fontWeight: 'bold', marginTop: 12 }}>¡Tarjeta Guardada!</Text>
                <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, marginTop: 6, textAlign: 'center' }}>
                  Tu tarjeta de prueba está lista. Ya podés presionar "Confirmar y Reservar".
                </Text>
              </View>
            ) : (
              <View style={{ height: 820, width: '100%' }}>
                {Platform.OS === 'web' ? (
                  <iframe
                    srcDoc={`
                      <!DOCTYPE html>
                      <html>
                      <head>
                        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
                        <script type="module" src="https://unpkg.com/rebill@latest/dist/rebill/rebill.esm.js"></script>
                        <script nomodule src="https://unpkg.com/rebill@latest/dist/rebill/rebill.js"></script>
                        <style>
                          body { margin: 0; padding: 0px 10px; font-family: -apple-system, system-ui, sans-serif; background: transparent; }
                          #rebill-wrapper { display: flex; flex-direction: column; gap: 0px; }
                          #fallback-msg { color: white; display: none; margin-top: 10px; text-align: center; }
                        </style>
                      </head>
                      <body>
                        <div id="rebill-wrapper">
                          <rebill-save-card 
                            processing-country="AR"
                            environment="sandbox"
                            public-key="${process.env.EXPO_PUBLIC_REBILL_PUBLIC_KEY}" 
                            id="rebillCard"
                            display='{"logo": false, "sandboxMode": true, "footer": false, "successPage": false, "billingAddress": false}'
                            css='
                              :root, * {
                                color-scheme: dark !important;
                                --rebill-color-primary: #24C6A5 !important;
                                --rebill-color-background: transparent !important;
                                --rebill-color-surface: #1E2330 !important;
                                --rebill-color-card: transparent !important;
                                --rebill-color-text: #FFFFFF !important;
                                --rebill-input-bg: rgba(255,255,255,0.08) !important;
                                --rebill-border-color: rgba(255,255,255,0.15) !important;
                                --rebill-input-border-radius: 12px !important;
                                --rebill-input-padding: 14px !important;
                              }
                              body { background: transparent !important; color: white !important; }
                              header, .rebill-header, .rebill-logo-container { display: none !important; }
                              .rebill-select-menu, [role="listbox"] { z-index: 2147483647 !important; background-color: #1E2330 !important; }
                              [role="option"] { background-color: #1E2330 !important; color: #FFFFFF !important; }
                              input, select, .rebill-input { color: #FFFFFF !important; }
                            '
                          ></rebill-save-card>
                        </div>
                        <script>
                          const card = document.getElementById('rebillCard');
                          const handleSuccess = (e) => {
                            try {
                              const payload = e.detail || {};
                              const token = payload.id || payload.token || (payload.card && payload.card.id) || 'fake_token';
                              const method = payload.brand || (payload.card && payload.card.brand) || 'visa';
                              window.parent.postMessage(JSON.stringify({ type: 'SUCCESS', token: token, method: method, raw: payload }), '*');
                            } catch (err) {
                              window.parent.postMessage(JSON.stringify({ type: 'SUCCESS', token: 'fallback_token', method: 'visa' }), '*');
                            }
                          };
                          ['success', 'onSuccess', 'rebillSuccess', 'saved', 'rebill-success'].forEach(evt => {
                            card.addEventListener(evt, handleSuccess);
                          });
                          card.addEventListener('error', (e) => {
                            const payload = e.detail || {};
                            window.parent.postMessage(JSON.stringify({ type: 'ERROR', error: payload.message || 'Error al guardar tarjeta' }), '*');
                          });
                        </script>
                      </body>
                      </html>
                    `}
                    style={{ border: 'none', width: '100%', height: '820px', background: 'transparent' }}
                  />
                ) : (
                  <WebView
                    scrollEnabled={false}
                    originWhitelist={['*']}
                    source={{
                      baseUrl: 'https://parkfinder.com',
                      html: `
                      <!DOCTYPE html>
                      <html>
                      <head>
                        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
                        <script type="module" src="https://unpkg.com/rebill@latest/dist/rebill/rebill.esm.js"></script>
                        <script nomodule src="https://unpkg.com/rebill@latest/dist/rebill/rebill.js"></script>
                        <style>
                          body { margin: 0; padding: 0px 10px; font-family: -apple-system, system-ui, sans-serif; background: transparent; }
                          #rebill-wrapper { display: flex; flex-direction: column; gap: 0px; }
                          #fallback-msg { color: white; display: none; margin-top: 10px; text-align: center; }
                        </style>
                      </head>
                      <body>
                        <div id="rebill-wrapper">
                          <rebill-save-card 
                            processing-country="AR"
                            environment="sandbox"
                            public-key="${process.env.EXPO_PUBLIC_REBILL_PUBLIC_KEY}" 
                            id="rebillCard"
                            display='{"logo": false, "sandboxMode": true, "footer": false, "successPage": false, "billingAddress": false}'
                            css='
                              :root, * {
                                color-scheme: dark !important;
                                --rebill-color-primary: #24C6A5 !important;
                                --rebill-color-background: transparent !important;
                                --rebill-color-surface: #1E2330 !important;
                                --rebill-color-card: transparent !important;
                                --rebill-color-text: #FFFFFF !important;
                                --rebill-input-bg: rgba(255,255,255,0.08) !important;
                                --rebill-border-color: rgba(255,255,255,0.15) !important;
                                --rebill-input-border-radius: 12px !important;
                                --rebill-input-padding: 14px !important;
                              }
                              body { background: transparent !important; color: white !important; }
                              header, .rebill-header, .rebill-logo-container { display: none !important; height: 0 !important; margin: 0 !important; padding: 0 !important; }
                              .rebill-select-menu, [role="listbox"] { z-index: 2147483647 !important; background-color: #1E2330 !important; border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; }
                              [role="option"] { background-color: #1E2330 !important; color: #FFFFFF !important; }
                              div:focus-within, [class*="container"]:focus-within, [class*="group"]:focus-within, [class*="wrapper"]:focus-within { 
                                z-index: 2147483647 !important; 
                              }
                              [class*="country"] { background-color: #1E2330 !important; }
                              [class*="country"] * { color: #FFFFFF !important; }
                              input, select, .rebill-input { color: #FFFFFF !important; font-weight: 500 !important; }
                            '
                          ></rebill-save-card>
                          <div id="fallback-msg"></div>
                        </div>
                        <script>
                          const card = document.getElementById('rebillCard');
                          const handleSuccess = (e) => {
                            try {
                              const payload = e.detail || {};
                              const token = payload.id || payload.token || (payload.card && payload.card.id) || 'fake_token';
                              const method = payload.brand || (payload.card && payload.card.brand) || 'visa';
                              window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'SUCCESS', token: token, method: method, raw: payload }));
                            } catch (err) {
                              window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'SUCCESS', token: 'fallback_token', method: 'visa' }));
                            }
                          };
                          ['success', 'onSuccess', 'rebillSuccess', 'saved', 'rebill-success'].forEach(evt => {
                            card.addEventListener(evt, handleSuccess);
                          });
                          card.addEventListener('error', (e) => {
                            const payload = e.detail || {};
                            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ERROR', error: payload.message || 'Error al guardar tarjeta' }));
                          });
                        </script>
                      </body>
                      </html>
                    ` }}
                    style={{ backgroundColor: 'transparent' }}
                    onMessage={(event) => {
                      try {
                        const data = JSON.parse(event.nativeEvent.data);
                        if (data.type === 'ERROR') {
                          Alert.alert('Error de Tarjeta', data.error);
                        } else if (data.type === 'SUCCESS') {
                          const finalToken = data.token || data.raw?.id || data.raw?.token?.id || data.raw?.card?.id || 'rebill_token_placeholder';
                          setRebillToken(finalToken);
                        }
                      } catch (e) {
                        console.log("Ignored non-JSON webview message:", event.nativeEvent.data);
                      }
                    }}
                  />
                )}
              </View>
            )}
          </View>
        )}

        {/* Policy Alert Box */}
        <View style={styles.warningBox}>
          <View style={styles.warningHeader}>
            <Ionicons name="alert-circle" size={20} color="#FFD700" />
            <Text style={styles.warningTitle}>IMPORTANTE</Text>
          </View>
          <Text style={styles.warningText}>
            • La barrera se abrirá por lectura de patente.{"\n"}
            • Si llegas más de 10 min tarde, la reserva caduca.{"\n"}
            • Cancelación sin cargo hasta 30 min antes de la llegada.
          </Text>
        </View>

      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.confirmButton, isSubmitting && { opacity: 0.7 }]}
          onPress={handleCreateBooking}
          disabled={isSubmitting}
        >
          <LinearGradient
            colors={[theme.colors.primary, '#24C6A5']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.gradient}
          >
            {isSubmitting ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <Text style={styles.confirmText}>Confirmar y Reservar</Text>
                <Ionicons name="chevron-forward" size={20} color={theme.colors.background} />
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
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
  headerTitleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  summaryCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginBottom: 25,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  summaryIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(36, 198, 165, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  summaryName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  summaryAddress: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginVertical: 15,
  },
  policyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  policyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  policyText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '500',
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 15,
    marginLeft: 5,
  },
  glassSection: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginBottom: 25,
  },
  timeBox: {
    alignItems: 'center',
    marginBottom: 20,
  },
  timeValue: {
    fontSize: 48,
    fontWeight: '800',
    color: theme.colors.primary,
  },
  graceText: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 5,
    fontStyle: 'italic',
  },
  editBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  editBadgeText: {
    fontSize: 10,
    color: theme.colors.primary,
    fontWeight: 'bold',
  },
  quickOptions: {
    marginBottom: 5,
  },
  optionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  miniOption: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  activeMiniOption: {
    backgroundColor: 'rgba(36, 198, 165, 0.1)',
    borderColor: theme.colors.primary,
  },
  optionText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  vehicleScroll: {
    marginBottom: 25,
  },
  vehicleCard: {
    width: 125,
    padding: 15,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 20,
    marginRight: 15,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
  },
  vIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  selectedVehicle: {
    borderColor: theme.colors.primary,
    backgroundColor: 'rgba(36, 198, 165, 0.05)',
  },
  vPlate: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  vModel: {
    color: theme.colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  categoriesGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 25,
  },
  catCard: {
    flex: 1,
    padding: 15,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  selectedCat: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  catHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  catPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  catName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: 'white',
  },
  warningBox: {
    backgroundColor: 'rgba(255, 215, 0, 0.05)',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
    marginBottom: 20,
  },
  warningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  warningTitle: {
    color: '#FFD700',
    fontWeight: '900',
    fontSize: 12,
    letterSpacing: 1,
  },
  warningText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    lineHeight: 18,
  },
  footer: {
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 30 : 20,
    backgroundColor: theme.colors.background,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  confirmButton: {
    borderRadius: 18,
    overflow: 'hidden',
    height: 56,
  },
  gradient: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  confirmText: {
    color: theme.colors.background,
    fontSize: 18,
    fontWeight: 'bold',
  },
  paymentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
  },
  paymentTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  inputGroup: {
    marginBottom: 15,
  },
  inputLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 8,
    fontWeight: '600',
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 15,
    color: 'white',
    fontSize: 16,
  },
  row: {
    flexDirection: 'row',
  },
});
