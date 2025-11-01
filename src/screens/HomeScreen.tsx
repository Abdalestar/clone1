import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, SIZES } from '../utils/constants';
import { getUserStampCards } from '../services/stamps';
import { getCurrentUser } from '../services/auth';
import { StampCard as StampCardType, User } from '../types';
import StampCard from '../components/StampCard';

const HomeScreen = ({ navigation }: any) => {
  const [user, setUser] = useState<User | null>(null);
  const [cards, setCards] = useState<StampCardType[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const currentUser = await getCurrentUser();
      if (currentUser) {
        setUser(currentUser);
        const userCards = await getUserStampCards(currentUser.id);
        setCards(userCards);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const totalStamps = cards.reduce((sum, card) => sum + card.stamps_collected, 0);
  const completedCards = cards.filter(card => card.is_completed).length;
  const activeCards = cards.filter(card => !card.is_completed);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Greeting Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hi, {user?.full_name?.split(' ')[0] || 'there'}! 👋</Text>
          <Text style={styles.subGreeting}>Ready to collect stamps today?</Text>
        </View>
        <TouchableOpacity
          style={styles.notificationButton}
          onPress={() => {}}
          data-testid="notification-button"
        >
          <MaterialIcons name="notifications" size={24} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <MaterialIcons name="loyalty" size={32} color={COLORS.primary} />
          <Text style={styles.statNumber}>{totalStamps}</Text>
          <Text style={styles.statLabel}>Total Stamps</Text>
        </View>

        <View style={styles.statCard}>
          <MaterialIcons name="card-giftcard" size={32} color={COLORS.success} />
          <Text style={styles.statNumber}>{completedCards}</Text>
          <Text style={styles.statLabel}>Ready to Redeem</Text>
        </View>

        <View style={styles.statCard}>
          <MaterialIcons name="credit-card" size={32} color={COLORS.secondary} />
          <Text style={styles.statNumber}>{activeCards.length}</Text>
          <Text style={styles.statLabel}>Active Cards</Text>
        </View>
      </View>

      {/* Quick Action Button */}
      <TouchableOpacity
        style={styles.scanButton}
        onPress={() => navigation.navigate('Scan')}
        data-testid="quick-scan-button"
      >
        <MaterialIcons name="center-focus-strong" size={28} color={COLORS.white} />
        <Text style={styles.scanButtonText}>Scan or Tap to Collect Stamp</Text>
        <MaterialIcons name="arrow-forward" size={24} color={COLORS.white} />
      </TouchableOpacity>

      {/* Active Cards Section */}
      {activeCards.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Active Cards</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Wallet')}>
              <Text style={styles.seeAll}>See All</Text>
            </TouchableOpacity>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {activeCards.slice(0, 5).map((card) => (
              <StampCard
                key={card.id}
                card={card}
                onPress={() => navigation.navigate('Wallet')}
              />
            ))}
          </ScrollView>
        </View>
      )}

      {/* Completed Cards Ready to Redeem */}
      {completedCards > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>🎉 Ready to Redeem</Text>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {cards
              .filter(card => card.is_completed)
              .map((card) => (
                <StampCard
                  key={card.id}
                  card={card}
                  onPress={() => navigation.navigate('Wallet')}
                />
              ))}
          </ScrollView>
        </View>
      )}

      {/* Empty State */}
      {cards.length === 0 && (
        <View style={styles.emptyState}>
          <MaterialIcons name="card-giftcard" size={80} color={COLORS.lightGray} />
          <Text style={styles.emptyTitle}>No Cards Yet</Text>
          <Text style={styles.emptyText}>
            Visit the Shops tab to discover businesses and start collecting stamps!
          </Text>
          <TouchableOpacity
            style={styles.emptyButton}
            onPress={() => navigation.navigate('Shops')}
          >
            <Text style={styles.emptyButtonText}>Explore Shops</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Tips Section */}
      <View style={styles.tipsCard}>
        <MaterialIcons name="lightbulb" size={24} color={COLORS.warning} />
        <View style={styles.tipsContent}>
          <Text style={styles.tipsTitle}>💡 Quick Tip</Text>
          <Text style={styles.tipsText}>
            Enable NFC in Scan tab for faster stamp collection at participating businesses!
          </Text>
        </View>
      </View>

      <View style={{ height: 20 }} />
    </ScrollView>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SIZES.lg,
    backgroundColor: COLORS.white,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.dark,
  },
  subGreeting: {
    fontSize: 14,
    color: COLORS.gray,
    marginTop: 4,
  },
  notificationButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.light,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    padding: SIZES.md,
    gap: SIZES.sm,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: SIZES.md,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.dark,
    marginTop: SIZES.xs,
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.gray,
    marginTop: 4,
    textAlign: 'center',
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    marginHorizontal: SIZES.md,
    marginVertical: SIZES.md,
    padding: SIZES.lg,
    borderRadius: 16,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  scanButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
    marginHorizontal: SIZES.md,
  },
  section: {
    marginTop: SIZES.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SIZES.lg,
    marginBottom: SIZES.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.dark,
  },
  seeAll: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: SIZES.xxl,
    marginTop: SIZES.xxl,
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
  emptyButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SIZES.xl,
    paddingVertical: SIZES.md,
    borderRadius: 12,
    marginTop: SIZES.lg,
  },
  emptyButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  tipsCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF9E6',
    marginHorizontal: SIZES.md,
    marginTop: SIZES.lg,
    padding: SIZES.lg,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.warning,
  },
  tipsContent: {
    flex: 1,
    marginLeft: SIZES.md,
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.dark,
    marginBottom: 4,
  },
  tipsText: {
    fontSize: 13,
    color: COLORS.darkGray,
    lineHeight: 18,
  },
});

export default HomeScreen;
