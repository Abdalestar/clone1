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
      activeOpacity={0.9}
      data-testid="stamp-card"
    >
      <LinearGradient
        colors={isCompleted ? [COLORS.success, '#20c997'] : [COLORS.white, COLORS.light]}
        style={styles.gradient}
      >
        {isCompleted && (
          <View style={styles.completedBadge}>
            <MaterialIcons name="stars" size={20} color={COLORS.white} />
            <Text style={styles.completedText}>Ready to Redeem!</Text>
          </View>
        )}

        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <MaterialIcons
              name="store"
              size={40}
              color={isCompleted ? COLORS.white : COLORS.primary}
            />
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
              {card.business?.category || 'General'}
            </Text>
          </View>
        </View>

        <View style={styles.progressContainer}>
          <Text
            style={[
              styles.progressText,
              isCompleted && { color: COLORS.white },
            ]}
          >
            {card.stamps_collected} / {card.stamps_required} stamps
          </Text>
          <View style={styles.progressBarContainer}>
            <View style={[styles.progressBar, { width: `${progress}%` }]} />
          </View>
        </View>

        {renderStampGrid()}

        {isCompleted && (
          <Text style={styles.rewardText}>
            🎁 {card.business?.reward_description || 'Free Reward'}
          </Text>
        )}
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
