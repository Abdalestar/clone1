import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
} from 'react-native';
import { StaffSession, DashboardStats, StampTransaction } from '../types';
import { getDashboardStats, getRecentTransactions } from '../services/dashboard';
import { checkLowInventory } from '../services/inventory';

interface HomeScreenProps {
  session: StaffSession;
  onIssueStamp: () => void;
  onGenerateStamps: () => void;
}

export default function HomeScreen({ session, onIssueStamp, onGenerateStamps }: HomeScreenProps) {
  const [stats, setStats] = useState<DashboardStats>({
    stamps_issued_today: 0,
    customers_served_today: 0,
    rewards_redeemed_today: 0,
    available_stamps: 0,
  });
  const [transactions, setTransactions] = useState<StampTransaction[]>([]);
  const [lowInventory, setLowInventory] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, [session.merchant_id]);

  const loadDashboardData = async () => {
    try {
      const [statsData, transactionsData, isLow] = await Promise.all([
        getDashboardStats(session.merchant_id),
        getRecentTransactions(session.merchant_id, 4),
        checkLowInventory(session.merchant_id, 50),
      ]);

      setStats(statsData);
      setTransactions(transactionsData);
      setLowInventory(isLow);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'stamp_issued':
        return '✅';
      case 'reward_redeemed':
        return '🎁';
      case 'stamp_voided':
        return '❌';
      default:
        return '📝';
    }
  };

  const getTransactionText = (type: string) => {
    switch (type) {
      case 'stamp_issued':
        return 'Stamp issued';
      case 'reward_redeemed':
        return 'Reward redeemed';
      case 'stamp_voided':
        return 'Stamp voided';
      default:
        return 'Transaction';
    }
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello, {session.name}</Text>
          <Text style={styles.role}>{session.role}</Text>
        </View>
        <TouchableOpacity style={styles.notificationButton}>
          <Text style={styles.notificationIcon}>🔔</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.issueStampButton}
        onPress={onIssueStamp}
        activeOpacity={0.8}
      >
        <Text style={styles.issueStampIcon}>🎫</Text>
        <Text style={styles.issueStampText}>ISSUE STAMP</Text>
      </TouchableOpacity>

      <View style={styles.statsContainer}>
        <Text style={styles.sectionTitle}>Today's Activity</Text>
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: '#E3F2FD' }]}>
            <Text style={styles.statNumber}>{stats.stamps_issued_today}</Text>
            <Text style={styles.statLabel}>Stamps</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#F3E5F5' }]}>
            <Text style={styles.statNumber}>{stats.customers_served_today}</Text>
            <Text style={styles.statLabel}>Customers</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#FFF9C4' }]}>
            <Text style={styles.statNumber}>{stats.rewards_redeemed_today}</Text>
            <Text style={styles.statLabel}>Rewards</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: lowInventory ? '#FFCCBC' : '#C8E6C9' }]}>
            <Text style={styles.statNumber}>{stats.available_stamps}</Text>
            <Text style={styles.statLabel}>Available</Text>
          </View>
        </View>
      </View>

      {lowInventory && (
        <View style={styles.warningCard}>
          <Text style={styles.warningIcon}>⚠️</Text>
          <View style={styles.warningContent}>
            <Text style={styles.warningTitle}>Low Inventory</Text>
            <Text style={styles.warningText}>
              Only {stats.available_stamps} stamps remaining
            </Text>
          </View>
          <TouchableOpacity
            style={styles.generateButton}
            onPress={onGenerateStamps}
          >
            <Text style={styles.generateButtonText}>Generate</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.activityContainer}>
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        {transactions.length === 0 ? (
          <Text style={styles.emptyText}>No activity yet today</Text>
        ) : (
          transactions.map((transaction, index) => (
            <View key={transaction.id || index} style={styles.activityCard}>
              <Text style={styles.activityIcon}>
                {getTransactionIcon(transaction.transaction_type)}
              </Text>
              <View style={styles.activityContent}>
                <Text style={styles.activityTitle}>
                  {transaction.customer?.name || 'Anonymous'}
                </Text>
                <Text style={styles.activitySubtitle}>
                  {getTransactionText(transaction.transaction_type)}
                  {transaction.method && ` (${transaction.method.toUpperCase()})`}
                </Text>
              </View>
              <Text style={styles.activityTime}>
                {formatTime(transaction.created_at)}
              </Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFFFFF',
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#212121',
  },
  role: {
    fontSize: 14,
    color: '#757575',
    marginTop: 4,
  },
  notificationButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationIcon: {
    fontSize: 20,
  },
  issueStampButton: {
    backgroundColor: '#4CAF50',
    marginHorizontal: 20,
    marginVertical: 20,
    paddingVertical: 40,
    borderRadius: 16,
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  issueStampIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  issueStampText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  statsContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212121',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: '48%',
    padding: 20,
    borderRadius: 12,
    marginBottom: 12,
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#212121',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#757575',
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  warningIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  warningContent: {
    flex: 1,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212121',
    marginBottom: 4,
  },
  warningText: {
    fontSize: 14,
    color: '#757575',
  },
  generateButton: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  generateButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  activityContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  emptyText: {
    textAlign: 'center',
    color: '#9E9E9E',
    fontSize: 14,
    paddingVertical: 20,
  },
  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  activityIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212121',
    marginBottom: 4,
  },
  activitySubtitle: {
    fontSize: 14,
    color: '#757575',
  },
  activityTime: {
    fontSize: 12,
    color: '#9E9E9E',
  },
});
