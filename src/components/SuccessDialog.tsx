import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import Modal from 'react-native-modal';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { COLORS, SIZES } from '../utils/constants';

interface SuccessDialogProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  message: string;
  businessName?: string;
  stampsCollected?: number;
  stampsRequired?: number;
  isComplete?: boolean;
}

const { width } = Dimensions.get('window');

const SuccessDialog: React.FC<SuccessDialogProps> = ({
  visible,
  onClose,
  title,
  message,
  businessName,
  stampsCollected = 0,
  stampsRequired = 10,
  isComplete = false,
}) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Scale animation
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }).start();

      // Rotate animation for check icon
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }).start();

      // Auto-dismiss after 3 seconds
      const timer = setTimeout(() => {
        onClose();
      }, 3000);

      return () => clearTimeout(timer);
    } else {
      scaleAnim.setValue(0);
      rotateAnim.setValue(0);
    }
  }, [visible]);

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Modal
      isVisible={visible}
      onBackdropPress={onClose}
      backdropOpacity={0.6}
      animationIn="fadeIn"
      animationOut="fadeOut"
      useNativeDriver
    >
      <Animated.View
        style={[
          styles.container,
          {
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <LinearGradient
          colors={isComplete ? ['#28A745', '#20c997'] : [COLORS.primary, COLORS.secondary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          {/* Success Icon */}
          <Animated.View
            style={[
              styles.iconContainer,
              { transform: [{ rotate }] },
            ]}
          >
            <View style={styles.iconCircle}>
              <MaterialIcons
                name={isComplete ? 'stars' : 'check-circle'}
                size={64}
                color={COLORS.white}
              />
            </View>
          </Animated.View>

          {/* Title */}
          <Text style={styles.title}>{title}</Text>

          {/* Business Name */}
          {businessName && (
            <Text style={styles.businessName}>{businessName}</Text>
          )}

          {/* Message */}
          <Text style={styles.message}>{message}</Text>

          {/* Progress Indicator */}
          {!isComplete && (
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${(stampsCollected / stampsRequired) * 100}%`,
                    },
                  ]}
                />
              </View>
              <Text style={styles.progressText}>
                {stampsCollected} / {stampsRequired} stamps
              </Text>
            </View>
          )}

          {/* Completion Badge */}
          {isComplete && (
            <View style={styles.completeBadge}>
              <MaterialIcons name="emoji-events" size={32} color="#FFD700" />
              <Text style={styles.completeText}>Card Complete!</Text>
            </View>
          )}

          {/* Close Button */}
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            activeOpacity={0.8}
          >
            <Text style={styles.closeButtonText}>
              {isComplete ? 'View Reward' : 'Continue'}
            </Text>
          </TouchableOpacity>
        </LinearGradient>

        {/* Glassmorphism overlay */}
        <View style={styles.glassOverlay} />
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    alignSelf: 'center',
    width: width - 48,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  gradient: {
    padding: SIZES.xxl,
    alignItems: 'center',
  },
  glassOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 24,
  },
  iconContainer: {
    marginBottom: SIZES.lg,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: SIZES.sm,
    textAlign: 'center',
  },
  businessName: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.white,
    opacity: 0.9,
    marginBottom: SIZES.xs,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: COLORS.white,
    opacity: 0.85,
    marginBottom: SIZES.lg,
    textAlign: 'center',
    lineHeight: 22,
  },
  progressContainer: {
    width: '100%',
    marginBottom: SIZES.lg,
  },
  progressBar: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: SIZES.sm,
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.white,
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
    textAlign: 'center',
  },
  completeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: SIZES.lg,
    paddingVertical: SIZES.md,
    borderRadius: 20,
    marginBottom: SIZES.lg,
  },
  completeText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.white,
    marginLeft: SIZES.sm,
  },
  closeButton: {
    backgroundColor: COLORS.white,
    paddingHorizontal: SIZES.xxl,
    paddingVertical: SIZES.md,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
});

export default SuccessDialog;
