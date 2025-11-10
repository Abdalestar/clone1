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
import { isOneTimeStamp, validateOneTimeStamp, claimOneTimeStamp, checkUserRateLimit } from '../services/oneTimeStamps';

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

  const startNFCReading = async () => {
    if (!nfcSupported || !nfcEnabled || isProcessing) return;

    try {
      setIsProcessing(true);
      await NFCService.startReading(async (tag) => {
        if (scanned) return;
        
        setScanned(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        
        // Process NFC tag data
        await handleScanData(tag.data, 'nfc');
      });
    } catch (error: any) {
      console.error('NFC error:', error);
      Alert.alert('NFC Error', error.message || 'Failed to read NFC tag');
    } finally {
      setIsProcessing(false);
      setTimeout(() => setScanned(false), 2000);
    }
  };

  const handleBarCodeScanned = async ({ type, data }: any) => {
    if (scanned || isProcessing) return;

    setScanned(true);
    setIsProcessing(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    await handleScanData(data, 'qr');
  };

  const handleScanData = async (data: string, method: 'nfc' | 'qr') => {
    try {
      console.log('Scanning data:', data.substring(0, 50) + '...'); // Log first 50 chars for debugging
      
      // Check if this is a one-time stamp (new format)
      if (isOneTimeStamp(data)) {
        await handleOneTimeStampScan(data);
        return;
      }

      // Otherwise, handle as regular business QR/NFC (existing flow)
      // Decode and verify payload
      const { valid, payload, error } = await decodePayload(data);

      if (!valid) {
        console.error('Payload validation failed:', error);
        Alert.alert(
          'Invalid Code', 
          error || 'The scanned code is invalid or expired',
          [{ text: 'OK', onPress: () => setScanned(false) }]
        );
        return;
      }

      if (!payload) {
        Alert.alert(
          'Error', 
          'Failed to read stamp data. Please try scanning again.',
          [{ text: 'OK', onPress: () => setScanned(false) }]
        );
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
        Alert.alert(
          'Business Not Found', 
          'This business is not registered in the system. Please contact the business.',
          [{ text: 'OK', onPress: () => setScanned(false) }]
        );
      }
    } catch (error: any) {
      console.error('Scan error:', error);
      Alert.alert(
        'Scan Error', 
        error.message || 'Failed to process stamp. Please try again.',
        [{ text: 'OK', onPress: () => setScanned(false) }]
      );
    } finally {
      setIsProcessing(false);
      setTimeout(() => setScanned(false), 3000);
    }
  };

  const handleOneTimeStampScan = async (stampCode: string) => {
    try {
      const user = await getCurrentUser();
      if (!user) {
        Alert.alert('Error', 'Please log in to collect stamps');
        return;
      }

      // Check rate limit to prevent abuse
      const withinLimit = await checkUserRateLimit(user.id);
      if (!withinLimit) {
        Alert.alert(
          'Rate Limit Exceeded',
          'You have scanned too many stamps recently. Please wait an hour and try again.'
        );
        return;
      }

      // Validate the stamp first
      const validation = await validateOneTimeStamp(stampCode);

      if (!validation.valid) {
        // Show appropriate error message
        Alert.alert('Invalid Stamp', validation.message);
        return;
      }

      // Claim the stamp (atomic operation)
      const result = await claimOneTimeStamp(stampCode, user.id);

      if (!result.success) {
        Alert.alert('Cannot Claim Stamp', result.message);
        return;
      }

      // Success! Animate and show success dialog
      animateStampSuccess();

      setSuccessData({
        title: result.is_completed ? '🎉 Card Complete!' : '✅ Stamp Added!',
        message: result.is_completed
          ? `Congratulations! You've earned your reward at ${result.business_name}!`
          : `Stamp added to ${result.business_name}!`,
        businessName: result.business_name,
        stampsCollected: result.stamps_collected || 0,
        stampsRequired: result.stamps_required || 10,
        isComplete: result.is_completed,
      });
      setShowSuccess(true);

      // Confetti for completion
      if (result.is_completed) {
        setTimeout(() => {
          confettiRef.current?.start();
        }, 300);
      }

      // Reload cards to show updated data
      await loadStampCards();
    } catch (error: any) {
      console.error('Error claiming one-time stamp:', error);
      Alert.alert('Error', error.message || 'Failed to claim stamp');
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
              Alert.alert(
                'NFC Not Available', 
                'NFC requires a custom development build or production app. If you are using Expo Go, please build a custom dev client to enable NFC. For now, please use QR scan instead.',
                [{ text: 'OK' }]
              );
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
              : !nfcSupported 
                ? 'NFC requires a custom build (not available in Expo Go). Use QR scan instead.'
                : 'NFC is disabled. Enable it in your device settings or use QR scan.'}
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
