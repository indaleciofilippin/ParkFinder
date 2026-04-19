import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import CustomButton from '../components/CustomButton';
import { checkBackendHealth } from '../../controllers/AppController';

export default function HomeScreen() {
  const [healthStatus, setHealthStatus] = useState('Checking health...');

  useEffect(() => {
    const fetchHealth = async () => {
      const status = await checkBackendHealth();
      setHealthStatus(status);
    };
    fetchHealth();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>ParkFinder Home</Text>
      <Text style={styles.status}>Backend Status: {healthStatus}</Text>
      <CustomButton title="Get Started" onPress={() => console.log('Pressed!')} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  status: {
    fontSize: 16,
    marginBottom: 40,
    color: '#666',
  }
});
