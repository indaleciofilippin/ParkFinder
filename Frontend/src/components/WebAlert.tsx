import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Modal } from 'react-native';

type AlertData = {
  title: string;
  message: string;
};

let setGlobalAlert: ((data: AlertData | null) => void) | null = null;

export const showWebAlert = (title: string, message: string) => {
  if (setGlobalAlert) {
    setGlobalAlert({ title, message });
  } else {
    // Fallback just in case it's not mounted
    window.alert(`${title}\n\n${message}`);
  }
};

export const WebAlert = () => {
  const [alertData, setAlertData] = useState<AlertData | null>(null);

  useEffect(() => {
    setGlobalAlert = setAlertData;
    return () => {
      setGlobalAlert = null;
    };
  }, []);

  if (Platform.OS !== 'web' || !alertData) return null;

  return (
    <View style={styles.overlay}>
      <View style={styles.modal}>
        <Text style={styles.title}>{alertData.title}</Text>
        <Text style={styles.message}>{alertData.message}</Text>
        <TouchableOpacity style={styles.button} onPress={() => setAlertData(null)}>
          <Text style={styles.buttonText}>Aceptar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  modal: {
    backgroundColor: '#1A1A1A',
    padding: 24,
    borderRadius: 16,
    width: '80%',
    maxWidth: 400,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    color: '#CCCCCC',
    fontSize: 16,
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 22,
  },
  button: {
    backgroundColor: '#FF6B00',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
    width: '100%',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
