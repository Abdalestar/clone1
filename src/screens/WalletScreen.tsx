import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, SIZES } from '../utils/constants';
import { getUserStampCards, redeemCard } from '../services/stamps';
import { getCurrentUser } from '../services/auth';
import { StampCard as StampCardType } from '../types';
import StampCard from '../components/StampCard';

const WalletScreen = () => {
  const [cards, setCards] = useState<StampCardType[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');

  useFocusEffect(
    useCallback(() => {
      loadCards();
    }, [])
  );

  const loadCards = async () => {
    try {
      const user = await getCurrentUser();
      if (user) {
        const userCards = await getUserStampCards(user.id);
        setCards(userCards);
      }
    } catch (error) {
      console.error('Error loading cards:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadCards();
  };

  const handleRedeem = async (card: StampCardType) => {
    if (!card.is_completed) {
      Alert.alert('Not Ready', 'This card is not complete yet. Keep collecting stamps!');
      return;
    }

    Alert.alert(
      'Redeem Reward',
      `Are you sure you want to redeem your reward at ${card.business?.name}?\n\n🎁 ${card.business?.reward_description}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Redeem',
          onPress: async () => {
            const user = await getCurrentUser();
            if (!user) return;

            const { error } = await redeemCard(card.id, user.id);
            if (error) {
              Alert.alert('Error', error);
            } else {
              Alert.alert(
                'Success!',
                'Reward redeemed successfully! Show this confirmation to the business.',
                [{ text: 'OK', onPress: () => loadCards() }]
              );
            }
          },
        },
      ]
    );
  };

  const getFilteredCards = () => {
    if (filter === 'active') {
      return cards.filter(c => !c.is_completed);
    } else if (filter === 'completed') {
      return cards.filter(c => c.is_completed);
    }
    return cards;
  };

  const filteredCards = getFilteredCards();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'all' && styles.filterTabActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>
            All ({cards.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterTab, filter === 'active' && styles.filterTabActive]}
          onPress={() => setFilter('active')}
        >
          <Text style={[styles.filterText, filter === 'active' && styles.filterTextActive]}>
            Active ({cards.filter(c => !c.is_completed).length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterTab, filter === 'completed' && styles.filterTabActive]}
          onPress={() => setFilter('completed')}
        >
          <Text style={[styles.filterText, filter === 'completed' && styles.filterTextActive]}>
            Complete ({cards.filter(c => c.is_completed).length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Cards List */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {filteredCards.length > 0 ? (
          filteredCards.map((card) => (
            <View key={card.id} style={styles.cardWrapper}>
              <StampCard card={card} onPress={() => card.is_completed && handleRedeem(card)} />
              {card.is_completed && (
                <TouchableOpacity
                  style={styles.redeemButton}
                  onPress={() => handleRedeem(card)}
                  data-testid="redeem-button"
                >
                  <MaterialIcons name="redeem" size={20} color={COLORS.white} />
                  <Text style={styles.redeemButtonText}>Redeem Now</Text>
                </TouchableOpacity>
              )}
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <MaterialIcons name="credit-card" size={80} color={COLORS.lightGray} />
            <Text style={styles.emptyTitle}>
              {filter === 'completed' ? 'No Completed Cards' : 'No Cards Yet'}
            </Text>
            <Text style={styles.emptyText}>
              {filter === 'completed'
                ? 'Keep collecting stamps to earn rewards!'
                : 'Visit the Shops tab to add cards and start collecting stamps.'}
            </Text>
          </View>
        )}

        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  filterContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    padding: SIZES.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  filterTab: {
    flex: 1,
    paddingVertical: SIZES.sm,
    alignItems: 'center',
    borderRadius: 8,
  },
  filterTabActive: {
    backgroundColor: COLORS.primary,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.gray,
  },
  filterTextActive: {
    color: COLORS.white,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SIZES.sm,
  },
  cardWrapper: {
    marginBottom: SIZES.md,
  },
  redeemButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.success,
    marginHorizontal: SIZES.md,
    marginTop: -SIZES.md,
    paddingVertical: SIZES.md,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  redeemButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: SIZES.sm,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: SIZES.xxl,
    marginTop: SIZES.xxl * 2,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.dark,
    marginTop: SIZES.lg,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.gray,
    textAlign: 'center',
    marginTop: SIZES.sm,
    lineHeight: 20,
  },
});

export default WalletScreen;
