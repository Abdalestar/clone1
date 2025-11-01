import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Switch,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../utils/constants';
import { getCurrentUser, signOut } from '../services/auth';
import { getUserStampCards } from '../services/stamps';
import { User, StampCard } from '../types';

const ProfileScreen = ({ navigation }: any) => {
  const [user, setUser] = useState<User | null>(null);
  const [cards, setCards] = useState<StampCard[]>([]);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkModeEnabled, setDarkModeEnabled] = useState(false);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const currentUser = await getCurrentUser();
      if (currentUser) {
        setUser(currentUser);
        const userCards = await getUserStampCards(currentUser.id);
        setCards(userCards);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            const { error } = await signOut();
            if (error) {
              Alert.alert('Error', error);
            }
          },
        },
      ]
    );
  };

  const totalStamps = cards.reduce((sum, card) => sum + card.stamps_collected, 0);
  const completedCards = cards.filter(card => card.is_completed).length;
  const paperSaved = cards.length;

  // Calculate tier based on total stamps
  const getTier = () => {
    if (totalStamps >= 100) return { name: 'Diamond', color: '#B9F2FF', icon: 'diamond' };
    if (totalStamps >= 50) return { name: 'Gold', color: '#FFD700', icon: 'star' };
    if (totalStamps >= 20) return { name: 'Silver', color: '#C0C0C0', icon: 'star-half' };
    return { name: 'Bronze', color: '#CD7F32', icon: 'star-border' };
  };

  const tier = getTier();

  // Get category breakdown
  const getCategoryStats = () => {
    const categories: Record<string, number> = {};
    cards.forEach(card => {
      const cat = card.business?.category || 'other';
      categories[cat] = (categories[cat] || 0) + card.stamps_collected;
    });
    return Object.entries(categories).sort((a, b) => b[1] - a[1]);
  };

  const categoryStats = getCategoryStats();

  return (
    <ScrollView style={styles.container}>
      {/* Profile Header */}
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <MaterialIcons name="person" size={50} color={COLORS.white} />
          </View>
          <View style={[styles.tierBadge, { backgroundColor: tier.color }]}>
            <MaterialIcons name={tier.icon as any} size={16} color={COLORS.white} />
          </View>
        </View>
        
        <Text style={styles.name}>{user?.full_name || 'User'}</Text>
        <Text style={styles.username}>@{user?.username || 'username'}</Text>
        <Text style={styles.tier}>{tier.name} Member</Text>
      </View>

      {/* Stats Dashboard */}
      <View style={styles.statsCard}>
        <Text style={styles.sectionTitle}>Your Impact</Text>
        
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <MaterialIcons name="loyalty" size={32} color={COLORS.primary} />
            <Text style={styles.statNumber}>{totalStamps}</Text>
            <Text style={styles.statLabel}>Total Stamps</Text>
          </View>

          <View style={styles.statItem}>
            <MaterialIcons name="card-giftcard" size={32} color={COLORS.success} />
            <Text style={styles.statNumber}>{completedCards}</Text>
            <Text style={styles.statLabel}>Rewards Earned</Text>
          </View>

          <View style={styles.statItem}>
            <MaterialIcons name="eco" size={32} color={COLORS.success} />
            <Text style={styles.statNumber}>{paperSaved}</Text>
            <Text style={styles.statLabel}>Paper Cards Saved</Text>
          </View>
        </View>

        <View style={styles.ecoMessage}>
          <MaterialIcons name="nature" size={20} color={COLORS.success} />
          <Text style={styles.ecoText}>
            You've saved {paperSaved} paper cards! 🌱 Keep going green!
          </Text>
        </View>
      </View>

      {/* Category Breakdown */}
      {categoryStats.length > 0 && (
        <View style={styles.categoryCard}>
          <Text style={styles.sectionTitle}>Your Favorites</Text>
          {categoryStats.slice(0, 5).map(([category, count]) => (
            <View key={category} style={styles.categoryRow}>
              <View style={styles.categoryInfo}>
                <View style={styles.categoryIcon}>
                  <MaterialIcons
                    name={category === 'coffee' ? 'local-cafe' : category === 'restaurant' ? 'restaurant' : 'store'}
                    size={20}
                    color={COLORS.primary}
                  />
                </View>
                <Text style={styles.categoryName}>{category}</Text>
              </View>
              <Text style={styles.categoryCount}>{count} stamps</Text>
            </View>
          ))}
        </View>
      )}

      {/* Settings */}
      <View style={styles.settingsCard}>
        <Text style={styles.sectionTitle}>Settings</Text>

        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <MaterialIcons name="notifications" size={24} color={COLORS.primary} />
            <Text style={styles.settingText}>Notifications</Text>
          </View>
          <Switch
            value={notificationsEnabled}
            onValueChange={setNotificationsEnabled}
            trackColor={{ false: COLORS.lightGray, true: COLORS.primary }}
            thumbColor={COLORS.white}
          />
        </View>

        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <MaterialIcons name="dark-mode" size={24} color={COLORS.primary} />
            <Text style={styles.settingText}>Dark Mode</Text>
          </View>
          <Switch
            value={darkModeEnabled}
            onValueChange={setDarkModeEnabled}
            trackColor={{ false: COLORS.lightGray, true: COLORS.primary }}
            thumbColor={COLORS.white}
          />
        </View>

        <TouchableOpacity style={styles.settingRow} onPress={() => {}}>
          <View style={styles.settingInfo}>
            <MaterialIcons name="location-on" size={24} color={COLORS.primary} />
            <Text style={styles.settingText}>Location Sharing</Text>
          </View>
          <MaterialIcons name="chevron-right" size={24} color={COLORS.gray} />
        </TouchableOpacity>
      </View>

      {/* Referral */}
      <View style={styles.referralCard}>
        <MaterialIcons name="card-giftcard" size={40} color={COLORS.warning} />
        <Text style={styles.referralTitle}>Invite Friends, Earn Bonus Stamps!</Text>
        <Text style={styles.referralText}>
          Share your referral code and get 5 bonus stamps for each friend who joins.
        </Text>
        <TouchableOpacity style={styles.referralButton} onPress={() => Alert.alert('Referral', 'Referral feature coming soon!')}>
          <MaterialIcons name="share" size={20} color={COLORS.white} />
          <Text style={styles.referralButtonText}>Share Code</Text>
        </TouchableOpacity>
      </View>

      {/* Logout Button */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} data-testid="logout-button">
        <MaterialIcons name="logout" size={20} color={COLORS.danger} />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    paddingVertical: SIZES.xxl,
    paddingHorizontal: SIZES.lg,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: SIZES.md,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: COLORS.white,
  },
  tierBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.white,
    marginTop: SIZES.sm,
  },
  username: {
    fontSize: 14,
    color: COLORS.white,
    opacity: 0.9,
    marginTop: 4,
  },
  tier: {
    fontSize: 12,
    color: COLORS.white,
    opacity: 0.8,
    marginTop: 4,
  },
  statsCard: {
    backgroundColor: COLORS.white,
    margin: SIZES.md,
    padding: SIZES.lg,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.dark,
    marginBottom: SIZES.md,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SIZES.lg,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
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
  ecoMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    padding: SIZES.md,
    borderRadius: 12,
  },
  ecoText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.darkGray,
    marginLeft: SIZES.sm,
  },
  categoryCard: {
    backgroundColor: COLORS.white,
    margin: SIZES.md,
    marginTop: 0,
    padding: SIZES.lg,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SIZES.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.light,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SIZES.sm,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.dark,
    textTransform: 'capitalize',
  },
  categoryCount: {
    fontSize: 13,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  settingsCard: {
    backgroundColor: COLORS.white,
    margin: SIZES.md,
    marginTop: 0,
    padding: SIZES.lg,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SIZES.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingText: {
    fontSize: 16,
    color: COLORS.dark,
    marginLeft: SIZES.md,
  },
  referralCard: {
    backgroundColor: '#FFF9E6',
    margin: SIZES.md,
    marginTop: 0,
    padding: SIZES.lg,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.warning,
  },
  referralTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.dark,
    marginTop: SIZES.sm,
    textAlign: 'center',
  },
  referralText: {
    fontSize: 13,
    color: COLORS.darkGray,
    marginTop: SIZES.xs,
    textAlign: 'center',
    lineHeight: 18,
  },
  referralButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.warning,
    paddingHorizontal: SIZES.xl,
    paddingVertical: SIZES.md,
    borderRadius: 12,
    marginTop: SIZES.md,
  },
  referralButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: SIZES.sm,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
    marginHorizontal: SIZES.md,
    padding: SIZES.lg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.danger,
  },
  logoutText: {
    color: COLORS.danger,
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: SIZES.sm,
  },
});

export default ProfileScreen;
