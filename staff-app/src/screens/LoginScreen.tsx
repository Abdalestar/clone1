import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Animated,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { loginWithPIN } from '../services/auth';
import { StaffSession } from '../types';

interface LoginScreenProps {
  onLoginSuccess: (session: StaffSession) => void;
}

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [shakeAnimation] = useState(new Animated.Value(0));

  const email = 'staff@demo.com';

  const handleNumberPress = (number: string) => {
    if (pin.length < 4) {
      const newPin = pin + number;
      setPin(newPin);

      if (newPin.length === 4) {
        handleLogin(newPin);
      }
    }
  };

  const handleBackspace = () => {
    setPin(pin.slice(0, -1));
  };

  const handleLogin = async (pinCode: string) => {
    setLoading(true);

    try {
      const result = await loginWithPIN(email, pinCode);

      if (result.success && result.session) {
        onLoginSuccess(result.session);
      } else {
        shake();
        setPin('');
        Alert.alert('Login Failed', result.message);
      }
    } catch (error) {
      shake();
      setPin('');
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnimation, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnimation, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnimation, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnimation, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const renderPinDots = () => {
    return (
      <Animated.View
        style={[styles.pinDotsContainer, { transform: [{ translateX: shakeAnimation }] }]}
      >
        {[0, 1, 2, 3].map(index => (
          <View
            key={index}
            style={[styles.pinDot, index < pin.length && styles.pinDotFilled]}
          />
        ))}
      </Animated.View>
    );
  };

  const renderNumberButton = (number: string) => (
    <TouchableOpacity
      key={number}
      style={styles.numberButton}
      onPress={() => handleNumberPress(number)}
      disabled={loading}
    >
      <Text style={styles.numberButtonText}>{number}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <View style={styles.header}>
        <Text style={styles.logo}>StampMe</Text>
        <Text style={styles.subtitle}>Staff Login</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.instruction}>Enter your 4-digit PIN</Text>

        {renderPinDots()}

        {loading && (
          <ActivityIndicator size="large" color="#1976D2" style={styles.loader} />
        )}

        <View style={styles.keypad}>
          <View style={styles.keypadRow}>
            {renderNumberButton('1')}
            {renderNumberButton('2')}
            {renderNumberButton('3')}
          </View>
          <View style={styles.keypadRow}>
            {renderNumberButton('4')}
            {renderNumberButton('5')}
            {renderNumberButton('6')}
          </View>
          <View style={styles.keypadRow}>
            {renderNumberButton('7')}
            {renderNumberButton('8')}
            {renderNumberButton('9')}
          </View>
          <View style={styles.keypadRow}>
            <View style={styles.numberButton} />
            {renderNumberButton('0')}
            <TouchableOpacity
              style={styles.numberButton}
              onPress={handleBackspace}
              disabled={loading || pin.length === 0}
            >
              <Text style={styles.backspaceText}>←</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.demoHint}>Demo PIN: 1234</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1976D2',
  },
  header: {
    alignItems: 'center',
    paddingTop: 80,
    paddingBottom: 40,
  },
  logo: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#E3F2FD',
  },
  content: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingTop: 40,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  instruction: {
    fontSize: 16,
    color: '#757575',
    marginBottom: 30,
  },
  pinDotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 50,
  },
  pinDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#1976D2',
    marginHorizontal: 12,
  },
  pinDotFilled: {
    backgroundColor: '#1976D2',
  },
  loader: {
    marginVertical: 20,
  },
  keypad: {
    width: '100%',
    maxWidth: 300,
  },
  keypadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  numberButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  numberButtonText: {
    fontSize: 28,
    fontWeight: '600',
    color: '#212121',
  },
  backspaceText: {
    fontSize: 32,
    color: '#757575',
  },
  demoHint: {
    marginTop: 30,
    fontSize: 14,
    color: '#9E9E9E',
    fontStyle: 'italic',
  },
});
