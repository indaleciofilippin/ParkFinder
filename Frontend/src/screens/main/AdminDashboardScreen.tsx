import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme/theme';
import { adminApi } from '../../services/api';
import { i18n } from '../../i18n';
import { LinearGradient } from 'expo-linear-gradient';

export const AdminDashboardScreen = ({ navigation }: any) => {
  const [users, setUsers] = useState<any[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Role Modal State
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [showRoleModal, setShowRoleModal] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await adminApi.getAllUsers();
      setUsers(data);
      setFilteredUsers(data);
    } catch (error) {
      Alert.alert('Error', 'No se pudieron cargar los usuarios');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (text: string) => {
    setSearch(text);
    const filtered = users.filter(u => 
      u.email.toLowerCase().includes(text.toLowerCase()) ||
      (u.profile?.first_name + ' ' + u.profile?.last_name).toLowerCase().includes(text.toLowerCase())
    );
    setFilteredUsers(filtered);
  };

  const handleChangeRole = async (role: string) => {
    if (!selectedUser) return;
    try {
      await adminApi.updateUser(selectedUser.id_user_auth, { role });
      setShowRoleModal(false);
      fetchUsers();
      Alert.alert(i18n.t('dashboard.title'), i18n.t('dashboard.success_role'));
    } catch (error) {
      Alert.alert('Error', 'No se pudo actualizar el rol');
    }
  };

  const handleDeleteUser = (userId: number) => {
    Alert.alert(
      i18n.t('dashboard.deactivate'),
      i18n.t('dashboard.confirm_deactivate'),
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Desactivar', 
          style: 'destructive',
          onPress: async () => {
            try {
              await adminApi.deleteUser(userId);
              fetchUsers();
              Alert.alert('Éxito', i18n.t('dashboard.success_delete'));
            } catch (error) {
              Alert.alert('Error', 'No se pudo desactivar el usuario');
            }
          }
        }
      ]
    );
  };

  const renderUserItem = ({ item }: { item: any }) => (
    <View style={styles.userCard}>
      <View style={styles.userInfo}>
        <Text style={styles.userName}>
          {item.profile?.first_name} {item.profile?.last_name}
        </Text>
        <Text style={styles.userEmail}>{item.email}</Text>
        <View style={[styles.roleBadge, { backgroundColor: getRoleColor(item.role) + '20' }]}>
          <Text style={[styles.roleText, { color: getRoleColor(item.role) }]}>
            {item.role?.toUpperCase()}
          </Text>
        </View>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity 
          onPress={() => {
            setSelectedUser(item);
            setShowRoleModal(true);
          }}
          style={styles.actionButton}
        >
          <Ionicons name="shield-outline" size={20} color={theme.colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity 
          onPress={() => handleDeleteUser(item.id_user_auth)}
          style={styles.actionButton}
        >
          <Ionicons name="trash-outline" size={20} color={theme.colors.error} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'dev': return '#FFD700';
      case 'admin': return theme.colors.secondary;
      case 'driver': return theme.colors.primary;
      default: return theme.colors.textSecondary;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{i18n.t('dashboard.title')}</Text>
        <TouchableOpacity onPress={fetchUsers} style={styles.backButton}>
          <Ionicons name="refresh" size={24} color={theme.colors.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={theme.colors.textSecondary} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder={i18n.t('dashboard.search_placeholder')}
          placeholderTextColor={theme.colors.textSecondary}
          value={search}
          onChangeText={handleSearch}
        />
      </View>

      {loading ? (
        <ActivityIndicator color={theme.colors.primary} style={{ flex: 1 }} />
      ) : (
        <FlatList
          data={filteredUsers}
          keyExtractor={(item) => item.id_user_auth.toString()}
          renderItem={renderUserItem}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={() => (
            <View style={styles.statsCard}>
              <Text style={styles.statsLabel}>{i18n.t('dashboard.total_users')}</Text>
              <Text style={styles.statsValue}>{users.length}</Text>
            </View>
          )}
        />
      )}

      {/* Role Picker Modal */}
      <Modal
        visible={showRoleModal}
        transparent
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{i18n.t('dashboard.change_role')}</Text>
            <Text style={styles.modalSubtitle}>{selectedUser?.email}</Text>
            
            <TouchableOpacity style={styles.roleOption} onPress={() => handleChangeRole('driver')}>
              <Text style={styles.roleOptionText}>DRIVER</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.roleOption} onPress={() => handleChangeRole('admin')}>
              <Text style={styles.roleOptionText}>ADMIN</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.roleOption} onPress={() => handleChangeRole('dev')}>
              <Text style={styles.roleOptionText}>DEV</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.roleOption, { borderBottomWidth: 0, marginTop: 10 }]} 
              onPress={() => setShowRoleModal(false)}
            >
              <Text style={[styles.roleOptionText, { color: theme.colors.error }]}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.m,
  },
  backButton: {
    padding: theme.spacing.s,
  },
  headerTitle: {
    fontSize: theme.typography.sizes.h3,
    color: theme.colors.text,
    fontWeight: theme.typography.weights.bold,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    margin: theme.spacing.m,
    borderRadius: 12,
    paddingHorizontal: theme.spacing.m,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  searchIcon: {
    marginRight: theme.spacing.s,
  },
  searchInput: {
    flex: 1,
    height: 50,
    color: theme.colors.text,
  },
  listContent: {
    padding: theme.spacing.m,
  },
  statsCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    padding: theme.spacing.l,
    marginBottom: theme.spacing.l,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  statsLabel: {
    color: theme.colors.textSecondary,
    fontSize: 14,
  },
  statsValue: {
    color: theme.colors.primary,
    fontSize: 32,
    fontWeight: theme.typography.weights.bold,
  },
  userCard: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: theme.spacing.m,
    marginBottom: theme.spacing.m,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: theme.typography.weights.bold,
  },
  userEmail: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    marginBottom: theme.spacing.s,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  roleText: {
    fontSize: 10,
    fontWeight: theme.typography.weights.bold,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: theme.spacing.s,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    backgroundColor: theme.colors.surface,
    borderRadius: 24,
    padding: theme.spacing.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  modalTitle: {
    color: theme.colors.text,
    fontSize: 20,
    fontWeight: theme.typography.weights.bold,
    textAlign: 'center',
    marginBottom: 4,
  },
  modalSubtitle: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  roleOption: {
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    alignItems: 'center',
  },
  roleOptionText: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: theme.typography.weights.medium,
  }
});
