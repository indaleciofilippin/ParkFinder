import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export const PROVIDER_DEFAULT = 'default';

export const Marker = ({ children }: any) => <View>{children}</View>;

const MapView = ({ children, style }: any) => {
  return (
    <View style={[styles.mapPlaceholder, style]}>
      <Text style={styles.text}>ParkFinder Map (Web Preview)</Text>
      <Text style={styles.subtext}>Interactive maps are optimized for mobile applications.</Text>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  mapPlaceholder: {
    backgroundColor: '#0a0f24',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  text: {
    color: '#00f2fe',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtext: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    textAlign: 'center',
  },
});

export default MapView;
