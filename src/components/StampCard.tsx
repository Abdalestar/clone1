import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../utils/constants';
import { StampCard as StampCardType } from '../types';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

interface StampCardProps {
  card: StampCardType;
  onPress?: () => void;
}

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 40;

const StampCard: React.FC<StampCardProps> = ({ card, onPress }) => {
  const progress = (card.stamps_collected / card.stamps_required) * 100;
  const isCompleted = card.is_completed;

  const renderStampGrid = () => {
    const stamps = [];
    const maxPerRow = 5;
    
    for (let i = 0; i < card.stamps_required; i++) {
      const isFilled = i < card.stamps_collected;
      stamps.push(
        <View
          key={i}
          style={[
            styles.stampCircle,
            isFilled ? styles.stampFilled : styles.stampEmpty,
          ]}
        >
          {isFilled && (
            <LinearGradient
              colors={[COLORS.success, COLORS.successLight]}
              style={styles.stampGradient}
            >
              <MaterialIcons name="check" size={14} color={COLORS.white} />
            </LinearGradient>
          )}
        </View>
      );
    }

    return <View style={styles.stampGrid}>{stamps}</View>;
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.95}
      data-testid="stamp-card"
    >
      <LinearGradient
        colors={
          isCompleted
            ? [COLORS.gradientStart, COLORS.gradientEnd]
            : [COLORS.white, COLORS.light]
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        {/* Glassmorphism Overlay */}
        {isCompleted && (
          <View style={styles.glassOverlay}>
            <BlurView intensity={20} style={styles.blurView} tint="light" />
          </View>
        )}

        {/* Completion Badge */}
        {isCompleted && (
          <View style={styles.completedBadge}>
            <LinearGradient
              colors={[COLORS.gold, '#FFA500']}
              style={styles.badgeGradient}
            >
              <MaterialIcons name="stars" size={20} color={COLORS.white} />
              <Text style={styles.completedText}>Ready to Redeem!</Text>
            </LinearGradient>
          </View>
        )}

        {/* Header Section */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <LinearGradient
              colors={isCompleted ? [COLORS.white, COLORS.lightGray] : [COLORS.primary, COLORS.primaryDark]}
              style={styles.logoGradient}
            >
              <MaterialIcons
                name="store"
                size={36}
                color={isCompleted ? COLORS.primary : COLORS.white}
              />
            </LinearGradient>
          </View>
          <View style={styles.businessInfo}>
            <Text
              style={[
                styles.businessName,
                isCompleted && { color: COLORS.white },
              ]}
              numberOfLines={1}
            >
              {card.business?.name || 'Business'}
            </Text>
            <Text
              style={[
                styles.category,
                isCompleted && { color: COLORS.white, opacity: 0.9 },
              ]}
            >
              {card.business?.category || 'General'} • ⭐ {card.business?.rating || 5.0}
            </Text>
          </View>
        </View>

        {/* Progress Section with Fintech Style */}
        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text
              style={[
                styles.progressLabel,
                isCompleted && { color: COLORS.white },
              ]}
            >
              Progress
            </Text>
            <Text
              style={[
                styles.progressPercentage,
                isCompleted && { color: COLORS.white },
              ]}
            >
              {Math.round(progress)}%
            </Text>
          </View>
          
          <View style={styles.progressBarContainer}>
            <View style={styles.progressBarBg}>
              <LinearGradient
                colors={[COLORS.success, COLORS.successLight]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.progressBarFill, { width: `${progress}%` }]}
              />
            </View>
          </View>
          
          <Text
            style={[
              styles.stampCount,
              isCompleted && { color: COLORS.white },
            ]}
          >
            {card.stamps_collected} of {card.stamps_required} stamps collected
          </Text>
        </View>

        {/* Stamp Grid */}
        {renderStampGrid()}

        {/* Reward Section */}
        {isCompleted && card.business?.reward_description && (
          <View style={styles.rewardSection}>
            <View style={styles.rewardBadge}>
              <MaterialIcons name="card-giftcard" size={24} color={COLORS.gold} />
              <Text style={styles.rewardText}>
                {card.business.reward_description}
              </Text>
            </View>
          </View>
        )}

        {/* Decorative Corner Elements */}
        <View style={styles.cornerTopLeft} />
        <View style={styles.cornerBottomRight} />
      </LinearGradient>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    width: CARD_WIDTH,
    marginHorizontal: SIZES.md,
    marginVertical: SIZES.sm,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  gradient: {
    borderRadius: 16,
    padding: SIZES.lg,
  },
  completedBadge: {
    position: 'absolute',
    top: SIZES.sm,
    right: SIZES.sm,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.3)',
    paddingHorizontal: SIZES.sm,
    paddingVertical: SIZES.xs / 2,
    borderRadius: 20,
  },
  completedText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SIZES.md,
  },
  logoContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SIZES.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  businessInfo: {
    flex: 1,
  },
  businessName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.dark,
    marginBottom: 4,
  },
  category: {
    fontSize: 14,
    color: COLORS.gray,
    textTransform: 'capitalize',
  },
  progressContainer: {
    marginBottom: SIZES.md,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.dark,
    marginBottom: SIZES.xs,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: COLORS.lightGray,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: COLORS.success,
    borderRadius: 4,
  },
  stampGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginVertical: SIZES.md,
  },
  stampCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    margin: 6,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  stampEmpty: {
    backgroundColor: COLORS.white,
    borderColor: COLORS.border,
  },
  stampFilled: {
    backgroundColor: COLORS.success,
    borderColor: COLORS.success,
  },
  rewardText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
    textAlign: 'center',
    marginTop: SIZES.sm,
  },
});

export default StampCard;
