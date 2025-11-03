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
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  gradient: {
    borderRadius: 20,
    padding: SIZES.lg,
    position: 'relative',
    overflow: 'hidden',
  },
  glassOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 20,
    overflow: 'hidden',
  },
  blurView: {
    ...StyleSheet.absoluteFillObject,
  },
  completedBadge: {
    position: 'absolute',
    top: SIZES.md,
    right: SIZES.md,
    zIndex: 10,
    borderRadius: 20,
    overflow: 'hidden',
  },
  badgeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.xs,
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
    marginBottom: SIZES.lg,
  },
  logoContainer: {
    marginRight: SIZES.md,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  logoGradient: {
    width: 64,
    height: 64,
    justifyContent: 'center',
    alignItems: 'center',
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
    fontSize: 13,
    color: COLORS.gray,
    textTransform: 'capitalize',
  },
  progressSection: {
    marginBottom: SIZES.lg,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZES.xs,
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textLight,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  progressPercentage: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.success,
  },
  progressBarContainer: {
    marginVertical: SIZES.sm,
  },
  progressBarBg: {
    height: 12,
    backgroundColor: COLORS.lightGray,
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 6,
  },
  stampCount: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textLight,
    marginTop: SIZES.xs,
  },
  stampGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginVertical: SIZES.md,
    gap: 8,
  },
  stampCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  stampEmpty: {
    backgroundColor: COLORS.lightGray,
    borderColor: COLORS.border,
  },
  stampFilled: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  stampGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
  },
  rewardSection: {
    marginTop: SIZES.md,
    alignItems: 'center',
  },
  rewardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: SIZES.lg,
    paddingVertical: SIZES.sm,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  rewardText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
    marginLeft: SIZES.sm,
  },
  cornerTopLeft: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 60,
    height: 60,
    borderTopLeftRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  cornerBottomRight: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 60,
    height: 60,
    borderBottomRightRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
});

export default StampCard;
