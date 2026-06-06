import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme/theme';
import { useAuth } from '../../context/AuthContext';
import { userApi } from '../../services/api';
import { LinearGradient } from 'expo-linear-gradient';

export const BankDetailsScreen = ({ navigation }: any) => {
  const { user, setUser } = useAuth();
  const [loading, setLoading] = useState(false);

  // Bank states
  const [cbuCvu, setCbuCvu] = useState(user?.profile?.cbu_cvu || '');
  const [bankAlias, setBankAlias] = useState(user?.profile?.bank_alias || '');
  const [cuit, setCuit] = useState(user?.profile?.cuit || '');

  const handleSaveBankDetails = async () => {
    setLoading(true);
    try {
      const updatedUser = await userApi.updateProfile(user.id_user_auth, {
        cbu_cvu: cbuCvu,
        bank_alias: bankAlias,
        cuit: cuit,
      });
      setUser(updatedUser);
      Alert.alert('Éxito', 'Tus datos bancarios han sido actualizados correctamente. Ya estás listo para recibir transferencias instantáneas.');
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Hubo un error al actualizar tus datos bancarios.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <SafeAreaView style={{ flex: 1 }}>
          <View style={styles.headerNav}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.glassButton}>
              <Ionicons name="chevron-back" size={24} color="white" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Datos Bancarios</Text>
            <View style={{ width: 44 }} />
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            
            <View style={styles.infoBox}>
              <Ionicons name="shield-checkmark" size={24} color={theme.colors.primary} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.infoTitle}>Pagos Seguros e Instantáneos</Text>
                <Text style={styles.infoText}>
                  ParkFinder transfiere tus ganancias automáticamente por cada reserva finalizada. Ingresa el CBU o CVU donde deseas recibir tu dinero.
                </Text>
              </View>
            </View>

            <View style={styles.formCard}>
              <View style={styles.inputGroup}>
                <Ionicons name="card-outline" size={20} color={theme.colors.textSecondary} style={styles.inputIcon} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.minimalLabel}>CBU / CVU (22 Dígitos)</Text>
                  <TextInput
                    style={styles.minimalInput}
                    value={cbuCvu}
                    onChangeText={setCbuCvu}
                    placeholder="Ej. 0000003100000000000000"
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    keyboardType="number-pad"
                    maxLength={22}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Ionicons name="at-outline" size={20} color={theme.colors.textSecondary} style={styles.inputIcon} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.minimalLabel}>Alias Bancario (Opcional)</Text>
                  <TextInput
                    style={styles.minimalInput}
                    value={bankAlias}
                    onChangeText={setBankAlias}
                    placeholder="Ej. PARK.FINDER.PAGO"
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    autoCapitalize="none"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Ionicons name="document-text-outline" size={20} color={theme.colors.textSecondary} style={styles.inputIcon} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.minimalLabel}>CUIT / CUIL</Text>
                  <TextInput
                    style={styles.minimalInput}
                    value={cuit}
                    onChangeText={setCuit}
                    placeholder="Ej. 20304050607"
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    keyboardType="number-pad"
                  />
                </View>
              </View>

              <TouchableOpacity 
                style={styles.actionButton} 
                onPress={handleSaveBankDetails}
                disabled={loading}
              >
                <LinearGradient
                  colors={[theme.colors.primary, '#24C6A5']}
                  style={styles.buttonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  {loading ? (
                    <ActivityIndicator color={theme.colors.background} />
                  ) : (
                    <>
                      <Text style={styles.buttonText}>Guardar Datos</Text>
                      <Ionicons name="save-outline" size={20} color={theme.colors.background} />
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>

          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  headerNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  glassButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(36, 198, 165, 0.05)',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(36, 198, 165, 0.2)',
    marginBottom: 25,
    alignItems: 'flex-start',
  },
  infoTitle: {
    color: theme.colors.primary,
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  infoText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    lineHeight: 18,
  },
  formCard: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  inputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  inputIcon: {
    width: 40,
    textAlign: 'center',
  },
  minimalLabel: {
    fontSize: 10,
    color: theme.colors.primary,
    fontWeight: '700',
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  minimalInput: {
    color: 'white',
    fontSize: 16,
    padding: 0,
    fontWeight: '600',
  },
  actionButton: {
    marginTop: 15,
    borderRadius: 16,
    overflow: 'hidden',
  },
  buttonGradient: {
    height: 54,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: theme.colors.background,
    fontWeight: '900',
    fontSize: 16,
    marginRight: 10,
  },
});
