import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../utils/constants';
import { format } from 'date-fns';

interface Review {
  id: string;
  user_name: string;
  user_avatar?: string;
  rating: number;
  comment: string;
  created_at: string;
}

interface ReviewCardProps {
  review: Review;
}

const ReviewCard: React.FC<ReviewCardProps> = ({ review }) => {
  const renderStars = () => {
    return (
      <View style={styles.starsContainer}>
        {[...Array(5)].map((_, index) => (
          <MaterialIcons
            key={index}
            name={index < review.rating ? 'star' : 'star-border'}
            size={16}
            color={COLORS.warning}
          />
        ))}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.userInfo}>
          {review.user_avatar ? (
            <Image source={{ uri: review.user_avatar }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <MaterialIcons name="person" size={20} color={COLORS.gray} />
            </View>
          )}
          <View style={styles.userDetails}>
            <Text style={styles.userName}>{review.user_name}</Text>
            <Text style={styles.date}>
              {format(new Date(review.created_at), 'MMM dd, yyyy')}
            </Text>
          </View>
        </View>
        {renderStars()}
      </View>

      {review.comment && (
        <Text style={styles.comment}>{review.comment}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: SIZES.md,
    marginVertical: SIZES.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SIZES.sm,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: SIZES.sm,
  },
  avatarPlaceholder: {
    backgroundColor: COLORS.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  date: {
    fontSize: 12,
    color: COLORS.gray,
  },
  starsContainer: {
    flexDirection: 'row',
  },
  comment: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
  },
});

export default ReviewCard;
