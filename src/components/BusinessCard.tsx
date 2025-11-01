import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../utils/constants';
import { Business } from '../types';

interface BusinessCardProps {
  business: Business;
  onPress: () => void;
}

const getCategoryIcon = (category: string) => {
  const icons: Record<string, any> = {
    coffee: 'local-cafe',
    restaurant: 'restaurant',
    gym: 'fitness-center',
    salon: 'content-cut',
    retail: 'shopping-bag',
    spa: 'spa',
  };
  return icons[category] || 'store';
};

const BusinessCard: React.FC<BusinessCardProps> = ({ business, onPress }) => {
  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.8}
      data-testid="business-card"
    >
      <View style={styles.iconContainer}>
        <MaterialIcons
          name={getCategoryIcon(business.category)}
          size={32}
          color={COLORS.primary}
        />
      </View>

      <View style={styles.content}>
        <Text style={styles.name} numberOfLines={1}>
          {business.name}
        </Text>
        <Text style={styles.category} numberOfLines={1}>
          {business.category}
        </Text>
        <Text style={styles.address} numberOfLines={1}>
          📍 {business.address}
        </Text>
        
        <View style={styles.footer}>
          <View style={styles.ratingContainer}>
            <MaterialIcons name="star" size={16} color={COLORS.warning} />
            <Text style={styles.rating}>{business.rating}</Text>
          </View>
          <Text style={styles.reward}>
            {business.stamps_required} stamps → {business.reward_description}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: SIZES.md,
    marginHorizontal: SIZES.md,
    marginVertical: SIZES.xs,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.light,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SIZES.md,
  },
  content: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.dark,
    marginBottom: 4,
  },
  category: {
    fontSize: 13,
    color: COLORS.primary,
    textTransform: 'capitalize',
    marginBottom: 4,
  },
  address: {
    fontSize: 12,
    color: COLORS.gray,
    marginBottom: SIZES.xs,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SIZES.xs,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rating: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.dark,
    marginLeft: 4,
  },
  reward: {
    fontSize: 11,
    color: COLORS.success,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
});

export default BusinessCard;
