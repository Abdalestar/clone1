import React, { useState, useEffect, useRef, useCallback } from 'react';
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
import { ScanScreenProps } from '../types/navigation';
import NFCService from '../services/nfc';
import { decodePayload } from '../utils/payload';
import SuccessDialog from '../components/SuccessDialog';

type ScanMode = 'qr' | 'nfc';

const ScanScreen: React.FC<ScanScreenProps> = ({ navigation }) => {
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
  const confettiRef = useRef<any>(null);

  // Use useRef for Animated values (not useState)
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseAnimationRef = useRef<Animated.CompositeAnimation | null>(null);

  // Use ref for scan flag to prevent race conditions
  const scanningRef = useRef(false);

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
    // Pulse animation for NFC mode with proper cleanup
    if (scanMode === 'nfc') {
      pulseAnimationRef.current = Animated.loop(
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
      );
      pulseAnimationRef.current.start();
    }

    // Cleanup: Stop animation when mode changes or component unmounts
    return () => {
      if (pulseAnimationRef.current) {
        pulseAnimationRef.current.stop();
        pulseAnimationRef.current = null;
      }
      // Reset pulse animation value
      pulseAnim.setValue(1);
    };
  }, [scanMode]);

  const requestPermissions = async () => {
    const { status } = await BarCodeScanner.requestPermissionsAsync();
    setHasPermission(status === 'granted');
  };

  const checkNFCStatus = async () => {
    try {
      const supported = await NFCService.isSupported();
      setNfcSupported(supported);
      
      if (supported) {
        const enabled = await NFCService.isEnabled();
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

  const startNFCReading = useCallback(async () => {
    if (!nfcSupported || !nfcEnabled || scanningRef.current) return;

    try {
      scanningRef.current = true;
      setScanned(true);
      setIsProcessing(true);

      await NFCService.startReading(async (tag) => {
        if (!scanningRef.current) return;

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        // Process NFC tag data
        await handleScanData(tag.data, 'nfc');
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to read NFC tag';
      Alert.alert('NFC Error', errorMessage);
    } finally {
      setIsProcessing(false);
      setTimeout(() => {
        setScanned(false);
        scanningRef.current = false;
      }, 2000);
    }
  }, [nfcSupported, nfcEnabled]);

  const handleBarCodeScanned = useCallback(async ({ type, data }: { type: string; data: string }) => {
    // Prevent race condition with ref check
    if (scanningRef.current) return;

    scanningRef.current = true;
    setScanned(true);
    setIsProcessing(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    await handleScanData(data, 'qr');
  }, []);

  const handleScanData = async (data: string, method: 'nfc' | 'qr') => {
    try {
      // Decode and verify payload
      const { valid, payload, error } = await decodePayload(data);
      
      if (!valid) {
        Alert.alert('Invalid Code', error || 'The scanned code is invalid or expired');
        return;
      }

      if (!payload) {
        Alert.alert('Error', 'Failed to read stamp data');
        return;
      }

      // Get business by ID from payload
      let business: Business | null = null;
      
      if (payload.businessId.startsWith('QR_') || payload.businessId.startsWith('SHOP_')) {
        // Legacy format - find by QR code or NFC tag
        if (method === 'qr') {
          business = await getBusinessByQR(payload.businessId);
        } else {
          business = await getBusinessByNFC(payload.businessId);
        }
      } else {
        // New format - direct business ID
        const { supabase } = await import('../services/supabase');
        const { data: bizData } = await supabase
          .from('businesses')
          .select('*')
          .eq('id', payload.businessId)
          .single();
        business = bizData;
      }

      if (business) {
        await handleStampCollection(business, method);
      } else {
        Alert.alert('Error', 'Business not found. Please try again.');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to process stamp';
      Alert.alert('Error', errorMessage);
    } finally {
      setIsProcessing(false);
      setTimeout(() => {
        setScanned(false);
        scanningRef.current = false;
      }, 3000);
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

      // Animate success
      animateStampSuccess();
      
      // Show success dialog
      setSuccessData({
        title: isCompleted ? '🎉 Card Complete!' : '✅ Stamp Added!',
        message: isCompleted
          ? `Congratulations! You've earned your reward!`
          : `Great! Keep collecting stamps.`,
        businessName: business.name,
        stampsCollected: updatedCard?.stamps_collected || 0,
        stampsRequired: business.stamps_required,
        isComplete: isCompleted,
      });
      setShowSuccess(true);
      
      // Confetti for completion
      if (isCompleted) {
        setTimeout(() => {
          confettiRef.current?.start();
        }, 300);
      }

      // Reload cards
      await loadStampCards();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      Alert.alert('Error', errorMessage);
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
          <Text style={styles.nfcTitle}>Ready to Tap</Text>
          <Text style={styles.nfcSubtitle}>
            {nfcSupported && nfcEnabled
              ? 'Tap the button below to scan'
              : 'NFC not available. Use QR scan instead.'}
          </Text>
          
          {nfcSupported && nfcEnabled && (
            <TouchableOpacity
              style={styles.nfcScanButton}
              onPress={startNFCReading}
              disabled={isProcessing || scanned}
              data-testid="nfc-tap-button"
            >
              {isProcessing ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <>
                  <MaterialIcons name="tap-and-play" size={28} color={COLORS.white} />
                  <Text style={styles.nfcScanButtonText}>
                    {scanned ? 'Scanning...' : 'Tap to Scan NFC'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}

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

      {/* Success Dialog */}
      <SuccessDialog
        visible={showSuccess}
        onClose={() => {
          setShowSuccess(false);
          if (successData.isComplete) {
            navigation.navigate('Wallet');
          }
        }}
        title={successData.title}
        message={successData.message}
        businessName={successData.businessName}
        stampsCollected={successData.stampsCollected}
        stampsRequired={successData.stampsRequired}
        isComplete={successData.isComplete}
      />

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
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.dark,
    textAlign: 'center',
    marginBottom: SIZES.sm,
  },
  nfcSubtitle: {
    fontSize: 14,
    color: COLORS.gray,
    textAlign: 'center',
    marginBottom: SIZES.xl,
  },
  nfcScanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.secondary,
    paddingHorizontal: SIZES.xxl,
    paddingVertical: SIZES.lg,
    borderRadius: 16,
    shadowColor: COLORS.secondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    marginVertical: SIZES.xl,
  },
  nfcScanButtonText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: SIZES.sm,
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
