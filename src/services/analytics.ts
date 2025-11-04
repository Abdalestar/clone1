import { supabase } from './supabase';
import { format, subDays, startOfWeek, endOfWeek } from 'date-fns';
import logger from '../utils/logger';

export interface StampAnalytics {
  totalStamps: number;
  stampsThisWeek: number;
  stampsThisMonth: number;
  stampsByDay: { date: string; count: number }[];
  stampsByCategory: { category: string; count: number }[];
  favoriteBusinesses: { businessName: string; stampCount: number }[];
}

export interface UserStats {
  totalCards: number;
  completedCards: number;
  activeCards: number;
  totalRedemptions: number;
  paperSaved: number;
  currentTier: string;
  nextTierProgress: number;
}

class AnalyticsService {
  async getUserAnalytics(userId: string): Promise<StampAnalytics> {
    try {
      // Get all stamps for user
      const { data: cards } = await supabase
        .from('stamp_cards')
        .select(`
          *,
          stamps(*),
          business:businesses(name, category)
        `)
        .eq('user_id', userId);

      if (!cards) {
        return this.getEmptyAnalytics();
      }

      const allStamps = cards.flatMap(card => card.stamps || []);
      const now = new Date();
      const weekStart = startOfWeek(now);
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      // Total stamps
      const totalStamps = allStamps.length;

      // Stamps this week
      const stampsThisWeek = allStamps.filter(
        stamp => new Date(stamp.collected_at) >= weekStart
      ).length;

      // Stamps this month
      const stampsThisMonth = allStamps.filter(
        stamp => new Date(stamp.collected_at) >= monthStart
      ).length;

      // Stamps by day (last 7 days)
      const stampsByDay = this.getStampsByDay(allStamps, 7);

      // Stamps by category
      const categoryMap = new Map<string, number>();
      cards.forEach(card => {
        const category = card.business?.category || 'Other';
        const count = card.stamps?.length || 0;
        categoryMap.set(category, (categoryMap.get(category) || 0) + count);
      });

      const stampsByCategory = Array.from(categoryMap.entries()).map(
        ([category, count]) => ({ category, count })
      );

      // Favorite businesses
      const businessMap = new Map<string, number>();
      cards.forEach(card => {
        const businessName = card.business?.name || 'Unknown';
        const count = card.stamps?.length || 0;
        businessMap.set(businessName, (businessMap.get(businessName) || 0) + count);
      });

      const favoriteBusinesses = Array.from(businessMap.entries())
        .map(([businessName, stampCount]) => ({ businessName, stampCount }))
        .sort((a, b) => b.stampCount - a.stampCount)
        .slice(0, 5);

      return {
        totalStamps,
        stampsThisWeek,
        stampsThisMonth,
        stampsByDay,
        stampsByCategory,
        favoriteBusinesses,
      };
    } catch (error) {
      logger.error('Failed to get user analytics', error);
      return this.getEmptyAnalytics();
    }
  }

  async getUserStats(userId: string): Promise<UserStats> {
    try {
      const { data: cards } = await supabase
        .from('stamp_cards')
        .select('*')
        .eq('user_id', userId);

      const { data: redemptions } = await supabase
        .from('redemptions')
        .select('*')
        .eq('user_id', userId);

      const totalCards = cards?.length || 0;
      const completedCards = cards?.filter(c => c.is_completed).length || 0;
      const activeCards = totalCards - completedCards;
      const totalRedemptions = redemptions?.length || 0;

      // Calculate paper saved (assume 1 card = 1 sheet of paper)
      const paperSaved = totalCards;

      // Calculate tier based on total stamps
      const totalStamps = cards?.reduce((sum, card) => sum + card.stamps_collected, 0) || 0;
      const { tier, progress } = this.calculateTier(totalStamps);

      return {
        totalCards,
        completedCards,
        activeCards,
        totalRedemptions,
        paperSaved,
        currentTier: tier,
        nextTierProgress: progress,
      };
    } catch (error) {
      logger.error('Failed to get user stats', error);
      return {
        totalCards: 0,
        completedCards: 0,
        activeCards: 0,
        totalRedemptions: 0,
        paperSaved: 0,
        currentTier: 'Bronze',
        nextTierProgress: 0,
      };
    }
  }

  private getStampsByDay(stamps: any[], days: number): { date: string; count: number }[] {
    const result: { date: string; count: number }[] = [];
    const now = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = subDays(now, i);
      const dateStr = format(date, 'MMM dd');
      const count = stamps.filter(
        stamp => format(new Date(stamp.collected_at), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
      ).length;
      result.push({ date: dateStr, count });
    }

    return result;
  }

  private calculateTier(totalStamps: number): { tier: string; progress: number } {
    const tiers = [
      { name: 'Bronze', threshold: 0 },
      { name: 'Silver', threshold: 10 },
      { name: 'Gold', threshold: 25 },
      { name: 'Platinum', threshold: 50 },
      { name: 'Diamond', threshold: 100 },
    ];

    let currentTier = tiers[0];
    let nextTier = tiers[1];

    for (let i = 0; i < tiers.length - 1; i++) {
      if (totalStamps >= tiers[i].threshold && totalStamps < tiers[i + 1].threshold) {
        currentTier = tiers[i];
        nextTier = tiers[i + 1];
        break;
      } else if (totalStamps >= tiers[tiers.length - 1].threshold) {
        currentTier = tiers[tiers.length - 1];
        nextTier = tiers[tiers.length - 1];
        break;
      }
    }

    const progress = nextTier.threshold > 0
      ? ((totalStamps - currentTier.threshold) / (nextTier.threshold - currentTier.threshold)) * 100
      : 100;

    return { tier: currentTier.name, progress: Math.min(progress, 100) };
  }

  private getEmptyAnalytics(): StampAnalytics {
    return {
      totalStamps: 0,
      stampsThisWeek: 0,
      stampsThisMonth: 0,
      stampsByDay: [],
      stampsByCategory: [],
      favoriteBusinesses: [],
    };
  }

  async trackEvent(userId: string, eventName: string, eventData?: any): Promise<void> {
    try {
      // In production, send to analytics service (e.g., Google Analytics, Mixpanel)
      logger.info('Event tracked', { userId, eventName, eventData });
    } catch (error) {
      logger.error('Failed to track event', error);
    }
  }
}

export const analyticsService = new AnalyticsService();
export default analyticsService;
