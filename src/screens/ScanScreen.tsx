import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Animated,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { BarCodeScanner } from 'expo-barcode-scanner';
import * as Haptics from 'expo-haptics';
import { MaterialIcons } from '@expo/vector-icons';
import ConfettiCannon from 'react-native-confetti-cannon';
import { COLORS, SIZES } from '../utils/constants';
import { getBusinessByQR, getBusinessByNFC, getUserStampCards, createStampCard, addStamp } from '../services/stamps';
import { getCurrentUser } from '../services/auth';
import { Business, StampCard } from '../types';
import NFCService from '../services/nfc';
import { decodePayload } from '../utils/payload';
import SuccessDialog from '../components/SuccessDialog';

type ScanMode = 'qr' | 'nfc';

const ScanScreen = ({ navigation }: any) => {
  const [scanMode, setScanMode] = useState<ScanMode>('qr');
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [nfcSupported, setNfcSupported] = useState(true);
  const [nfcEnabled, setNfcEnabled] = useState(false);
  const [stampCards, setStampCards] = useState<StampCard[]>([]);
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successData, setSuccessData] = useState<{
    title: string;
    message: string;
    businessName?: string;
    stampsCollected?: number;
    stampsRequired?: number;
    isComplete?: boolean;
  }>({
    title: '',
    message: '',
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const confettiRef = React.useRef<any>(null);
  
  const scaleAnim = useState(new Animated.Value(1))[0];
  const pulseAnim = useState(new Animated.Value(1))[0];

  useEffect(() => {
    requestPermissions();
    loadStampCards();
    checkNFCStatus();
    
    return () => {
      // Cleanup NFC on unmount
      if (scanMode === 'nfc') {
        NFCService.cleanup();
      }
    };
  }, []);

  useEffect(() => {
    if (scanMode === 'nfc' && nfcEnabled) {
      // NFC reading handled by button press, not auto-start
    }
    return () => {
      if (scanMode === 'nfc') {
        NFCService.stopReading();
      }
    };
  }, [scanMode, nfcEnabled]);

  useEffect(() => {
    // Pulse animation for NFC mode
    if (scanMode === 'nfc') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [scanMode]);

  const requestPermissions = async () => {
    const { status } = await BarCodeScanner.requestPermissionsAsync();
    setHasPermission(status === 'granted');
  };

  const checkNFCStatus = async () => {
    try {
      const supported = await NFC.hasHardwareAsync();
      setNfcSupported(supported);
      
      if (supported) {
        const enabled = await NFC.isEnabledAsync();
        setNfcEnabled(enabled);
      }
    } catch (error) {
      console.log('NFC not available:', error);
      setNfcSupported(false);
    }
  };

  const loadStampCards = async () => {
    try {
      const user = await getCurrentUser();
      if (user) {
        const cards = await getUserStampCards(user.id);
        const activeCards = cards.filter(c => !c.is_completed);
        setStampCards(activeCards);
        if (activeCards.length > 0) {
          setSelectedCard(activeCards[0].id);
        }
      }
    } catch (error) {
      console.error('Error loading cards:', error);
    }
  };

  const startNFCReading = async () => {
    if (!nfcSupported || !nfcEnabled) return;

    try {
      await NFC.setEventListenerAsync((event: any) => {
        if (event.type === 'discovered') {
          handleNFCScan(event);
        }
      });
    } catch (error) {
      console.error('NFC error:', error);
    }
  };

  const stopNFCReading = async () => {
    try {
      await NFC.setEventListenerAsync(null);
    } catch (error) {
      console.error('Stop NFC error:', error);
    }
  };

  const handleNFCScan = async (event: any) => {
    if (scanned) return;

    try {
      const tagId = event.id || event.ndefMessage?.[0]?.payload;
      if (!tagId) return;

      setScanned(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Find business by NFC tag
      const business = await getBusinessByNFC(tagId);
      if (business) {
        await handleStampCollection(business, 'nfc');
      } else {
        Alert.alert('Error', 'Business not found for this NFC tag');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setTimeout(() => setScanned(false), 2000);
    }
  };

  const handleBarCodeScanned = async ({ type, data }: any) => {
    if (scanned) return;

    setScanned(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    try {
      // Find business by QR code
      const business = await getBusinessByQR(data);
      if (business) {
        await handleStampCollection(business, 'qr');
      } else {
        Alert.alert('Error', 'Invalid QR code. Please scan a valid business QR code.');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setTimeout(() => setScanned(false), 3000);
    }
  };

  const handleStampCollection = async (business: Business, method: 'nfc' | 'qr') => {
    try {
      const user = await getCurrentUser();
      if (!user) {
        Alert.alert('Error', 'Please log in to collect stamps');
        return;
      }

      // Find or create stamp card for this business
      let card = stampCards.find(c => c.business_id === business.id);
      
      if (!card) {
        const { data, error } = await createStampCard(user.id, business.id);
        if (error) throw new Error(error);
        card = data;
      }

      if (!card) {
        throw new Error('Failed to create stamp card');
      }

      // Add stamp
      const { data: updatedCard, error, isCompleted } = await addStamp(card.id, method);
      
      if (error) {
        Alert.alert('Error', error);
        return;
      }

      // Show success animation
      animateStampSuccess();
      
      if (isCompleted) {
        confettiRef.current?.start();
        setTimeout(() => {
          Alert.alert(
            '🎉 Congratulations!',
            `Your stamp card for ${business.name} is complete! You can now redeem your reward: ${business.reward_description}`,
            [
              {
                text: 'View Wallet',
                onPress: () => navigation.navigate('Wallet'),
              },
              { text: 'Continue', style: 'cancel' },
            ]
          );
        }, 1000);
      } else {
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 2000);
        Alert.alert(
          '✅ Stamp Added!',
          `Stamp collected at ${business.name}. Progress: ${updatedCard?.stamps_collected || 0}/${business.stamps_required}`,
          [{ text: 'Great!' }]
        );
      }

      // Reload cards
      await loadStampCards();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const animateStampSuccess = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1.3,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  if (hasPermission === null) {
    return (
      <View style={styles.centerContainer}>
        <Text>Requesting camera permission...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.centerContainer}>
        <MaterialIcons name="camera" size={64} color={COLORS.gray} />
        <Text style={styles.errorText}>Camera permission is required</Text>
        <TouchableOpacity style={styles.button} onPress={requestPermissions}>
          <Text style={styles.buttonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Mode Toggle */}
      <View style={styles.toggleContainer}>
        <TouchableOpacity
          style={[styles.toggleButton, scanMode === 'qr' && styles.toggleButtonActive]}
          onPress={() => setScanMode('qr')}
          data-testid="qr-mode-button"
        >
          <MaterialIcons
            name="qr-code-scanner"
            size={24}
            color={scanMode === 'qr' ? COLORS.white : COLORS.primary}
          />
          <Text
            style={[
              styles.toggleText,
              scanMode === 'qr' && styles.toggleTextActive,
            ]}
          >
            QR Scan
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.toggleButton, scanMode === 'nfc' && styles.toggleButtonActive]}
          onPress={() => {
            if (!nfcSupported) {
              Alert.alert('Not Supported', 'NFC is not available on this device. Please use QR scan instead.');
            } else if (!nfcEnabled) {
              Alert.alert('NFC Disabled', 'Please enable NFC in your device settings.');
            } else {
              setScanMode('nfc');
            }
          }}
          data-testid="nfc-mode-button"
        >
          <MaterialIcons
            name="nfc"
            size={24}
            color={scanMode === 'nfc' ? COLORS.white : COLORS.secondary}
          />
          <Text
            style={[
              styles.toggleText,
              scanMode === 'nfc' && styles.toggleTextActive,
            ]}
          >
            NFC Tap
          </Text>
        </TouchableOpacity>
      </View>

      {/* QR Scanner */}
      {scanMode === 'qr' && (
        <View style={styles.scannerContainer}>
          <BarCodeScanner
            onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
            style={StyleSheet.absoluteFillObject}
          />
          <View style={styles.overlay}>
            <View style={styles.scanFrame} />
            <Text style={styles.instructionText}>
              Position QR code within the frame
            </Text>
          </View>
        </View>
      )}

      {/* NFC Reader */}
      {scanMode === 'nfc' && (
        <View style={styles.nfcContainer}>
          <Animated.View
            style={[styles.nfcIcon, { transform: [{ scale: pulseAnim }] }]}
          >
            <MaterialIcons name="nfc" size={100} color={COLORS.secondary} />
          </Animated.View>
          <Text style={styles.nfcTitle}>Hold phone near business terminal</Text>
          <Text style={styles.nfcSubtitle}>
            {nfcSupported && nfcEnabled
              ? 'Ready to tap...'
              : 'NFC not available. Use QR scan instead.'}
          </Text>
          
          <View style={styles.nfcWaves}>
            {[...Array(3)].map((_, i) => (
              <View
                key={i}
                style={styles.wave}
              />
            ))}
          </View>
        </View>
      )}

      {/* Success Indicator */}
      {showSuccess && (
        <Animated.View
          style={[styles.successBadge, { transform: [{ scale: scaleAnim }] }]}
        >
          <MaterialIcons name="check-circle" size={48} color={COLORS.success} />
          <Text style={styles.successText}>Stamp Added!</Text>
        </Animated.View>
      )}

      {/* Confetti */}
      <ConfettiCannon
        ref={confettiRef}
        count={200}
        origin={{ x: -10, y: 0 }}
        fadeOut
        autoStart={false}
      />

      {/* Manual Entry Option */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Can't scan? Use manual code entry
        </Text>
        <TouchableOpacity
          style={styles.manualButton}
          onPress={() => Alert.alert('Manual Entry', 'Enter code manually (Coming soon)')}
        >
          <MaterialIcons name="keyboard" size={20} color={COLORS.primary} />
          <Text style={styles.manualButtonText}>Manual Entry</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SIZES.xl,
  },
  toggleContainer: {
    flexDirection: 'row',
    margin: SIZES.md,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  toggleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SIZES.md,
    borderRadius: 10,
  },
  toggleButtonActive: {
    backgroundColor: COLORS.primary,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
    marginLeft: 8,
  },
  toggleTextActive: {
    color: COLORS.white,
  },
  scannerContainer: {
    flex: 1,
    position: 'relative',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  scanFrame: {
    width: 250,
    height: 250,
    borderWidth: 3,
    borderColor: COLORS.success,
    borderRadius: 20,
    backgroundColor: 'transparent',
  },
  instructionText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
    marginTop: SIZES.xl,
    textAlign: 'center',
  },
  nfcContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SIZES.xl,
  },
  nfcIcon: {
    marginBottom: SIZES.xl,
  },
  nfcTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.dark,
    textAlign: 'center',
    marginBottom: SIZES.sm,
  },
  nfcSubtitle: {
    fontSize: 14,
    color: COLORS.gray,
    textAlign: 'center',
  },
  nfcWaves: {
    position: 'absolute',
    top: '40%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  wave: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 2,
    borderColor: COLORS.secondary,
    opacity: 0.3,
  },
  successBadge: {
    position: 'absolute',
    top: '45%',
    left: '50%',
    transform: [{ translateX: -50 }, { translateY: -50 }],
    alignItems: 'center',
    backgroundColor: COLORS.white,
    padding: SIZES.xl,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  successText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.success,
    marginTop: SIZES.sm,
  },
  footer: {
    backgroundColor: COLORS.white,
    padding: SIZES.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 13,
    color: COLORS.gray,
    marginBottom: SIZES.sm,
  },
  manualButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SIZES.lg,
    paddingVertical: SIZES.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  manualButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
    marginLeft: 8,
  },
  errorText: {
    fontSize: 16,
    color: COLORS.gray,
    marginTop: SIZES.md,
    marginBottom: SIZES.xl,
    textAlign: 'center',
  },
  button: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SIZES.xl,
    paddingVertical: SIZES.md,
    borderRadius: 12,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ScanScreen;
