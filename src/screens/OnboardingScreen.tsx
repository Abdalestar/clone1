import React from 'react';
import { View, Text, StyleSheet, Image, Dimensions } from 'react-native';
import Onboarding from 'react-native-onboarding-swiper';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS } from '../utils/constants';
import { useUIStore } from '../store/useUIStore';

const { width } = Dimensions.get('window');

interface OnboardingScreenProps {
  onComplete: () => void;
}

const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ onComplete }) => {
  const completeOnboarding = useUIStore((state) => state.completeOnboarding);

  const handleDone = () => {
    completeOnboarding();
    onComplete();
  };

  return (
    <Onboarding
      onDone={handleDone}
      onSkip={handleDone}
      pages={[
        {
          backgroundColor: COLORS.primary,
          image: (
            <View style={styles.iconContainer}>
              <MaterialIcons name="qr-code-scanner" size={120} color={COLORS.white} />
            </View>
          ),
          title: 'Welcome to Loyalty Stamp',
          subtitle: 'Collect digital stamps at your favorite local businesses',
        },
        {
          backgroundColor: COLORS.secondary,
          image: (
            <View style={styles.iconContainer}>
              <MaterialIcons name="nfc" size={120} color={COLORS.white} />
            </View>
          ),
          title: 'Two Ways to Collect',
          subtitle: 'Scan QR codes or tap NFC tags to collect stamps instantly',
        },
        {
          backgroundColor: COLORS.success,
          image: (
            <View style={styles.iconContainer}>
              <MaterialIcons name="card-giftcard" size={120} color={COLORS.white} />
            </View>
          ),
          title: 'Earn Rewards',
          subtitle: 'Complete your stamp cards and redeem amazing rewards',
        },
        {
          backgroundColor: COLORS.info,
          image: (
            <View style={styles.iconContainer}>
              <MaterialIcons name="eco" size={120} color={COLORS.white} />
            </View>
          ),
          title: 'Go Paperless',
          subtitle: 'Help the environment by using digital stamp cards',
        },
        {
          backgroundColor: COLORS.primary,
          image: (
            <View style={styles.iconContainer}>
              <MaterialIcons name="celebration" size={120} color={COLORS.white} />
            </View>
          ),
          title: "Let's Get Started!",
          subtitle: 'Find nearby businesses and start collecting stamps today',
        },
      ]}
      containerStyles={styles.container}
      titleStyles={styles.title}
      subTitleStyles={styles.subtitle}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  iconContainer: {
    marginBottom: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.white,
    textAlign: 'center',
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.white,
    textAlign: 'center',
    paddingHorizontal: 40,
    opacity: 0.9,
  },
});

export default OnboardingScreen;
