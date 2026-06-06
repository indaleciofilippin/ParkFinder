import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Modal } from 'react-native';

type AlertData = {
  title: string;
  message: string;
  buttons?: any[];
};

let setGlobalAlert: ((data: AlertData | null) => void) | null = null;

export const showWebAlert = (title: string, message: string, buttons?: any[]) => {
  if (setGlobalAlert) {
    setGlobalAlert({ title, message, buttons });
  } else {
    // Fallback just in case it's not mounted
    window.alert(`${title}\n\n${message}`);
    // If there's a success or OK button with an onPress, try to run it (very limited fallback)
    if (buttons && buttons.length > 0) {
      const defaultBtn = buttons.find(b => b.text === 'OK' || b.text === 'Listo' || b.text === 'Aceptar') || buttons[buttons.length - 1];
      if (defaultBtn && defaultBtn.onPress) {
        defaultBtn.onPress();
      }
    }
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

  const handlePress = (button: any) => {
    setAlertData(null);
    if (button.onPress) {
      button.onPress();
    }
  };

  const renderButtons = () => {
    if (!alertData.buttons || alertData.buttons.length === 0) {
      return (
        <TouchableOpacity style={styles.button} onPress={() => setAlertData(null)}>
          <Text style={styles.buttonText}>Aceptar</Text>
        </TouchableOpacity>
      );
    }

    return alertData.buttons.map((btn: any, index: number) => {
      const isDestructive = btn.style === 'destructive';
      const isCancel = btn.style === 'cancel';
      return (
        <TouchableOpacity 
          key={index} 
          style={[
            styles.button, 
            isDestructive && { backgroundColor: '#FF3B30' },
            isCancel && { backgroundColor: '#333333' },
            { marginBottom: index < alertData.buttons!.length - 1 ? 10 : 0 }
          ]} 
          onPress={() => handlePress(btn)}
        >
          <Text style={styles.buttonText}>{btn.text || 'Aceptar'}</Text>
        </TouchableOpacity>
      );
    });
  };

  return (
    <View style={styles.overlay}>
      <View style={styles.modal}>
        <Text style={styles.title}>{alertData.title}</Text>
        <Text style={styles.message}>{alertData.message}</Text>
        <View style={{ width: '100%', marginTop: 10 }}>
          {renderButtons()}
        </View>
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
