import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { supabase } from './supabase';
import logger from '../utils/logger';

const QUEUE_KEY = '@sync_queue';
const CACHE_PREFIX = '@cache_';

export interface SyncItem {
  id: string;
  type: 'stamp' | 'card' | 'redemption';
  action: 'create' | 'update' | 'delete';
  data: any;
  timestamp: number;
  retryCount: number;
}

class OfflineSyncService {
  private isOnline: boolean = true;
  private syncQueue: SyncItem[] = [];
  private isSyncing: boolean = false;

  constructor() {
    this.init();
  }

  private async init(): Promise<void> {
    // Listen to network changes
    NetInfo.addEventListener((state) => {
      const wasOffline = !this.isOnline;
      this.isOnline = state.isConnected ?? false;

      logger.info('Network status changed', {
        isConnected: this.isOnline,
        type: state.type,
      });

      // If we just came online, sync queued items
      if (wasOffline && this.isOnline) {
        logger.info('Device is back online, starting sync');
        this.syncQueue.length > 0 && this.processQueue();
      }
    });

    // Load existing queue
    await this.loadQueue();
  }

  async isNetworkAvailable(): Promise<boolean> {
    const state = await NetInfo.fetch();
    return state.isConnected ?? false;
  }

  private async loadQueue(): Promise<void> {
    try {
      const queueData = await AsyncStorage.getItem(QUEUE_KEY);
      if (queueData) {
        this.syncQueue = JSON.parse(queueData);
        logger.info('Loaded sync queue', { count: this.syncQueue.length });
      }
    } catch (error) {
      logger.error('Failed to load sync queue', error);
    }
  }

  private async saveQueue(): Promise<void> {
    try {
      await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(this.syncQueue));
    } catch (error) {
      logger.error('Failed to save sync queue', error);
    }
  }

  async addToQueue(item: Omit<SyncItem, 'id' | 'timestamp' | 'retryCount'>): Promise<void> {
    const syncItem: SyncItem = {
      ...item,
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      retryCount: 0,
    };

    this.syncQueue.push(syncItem);
    await this.saveQueue();

    logger.info('Added item to sync queue', { type: item.type, action: item.action });

    // Try to sync immediately if online
    if (this.isOnline) {
      this.processQueue();
    }
  }

  async processQueue(): Promise<void> {
    if (this.isSyncing || this.syncQueue.length === 0) return;

    this.isSyncing = true;
    logger.info('Processing sync queue', { count: this.syncQueue.length });

    const failedItems: SyncItem[] = [];

    for (const item of this.syncQueue) {
      try {
        await this.syncItem(item);
        logger.info('Successfully synced item', { id: item.id, type: item.type });
      } catch (error) {
        logger.error('Failed to sync item', { id: item.id, error });

        // Retry logic
        if (item.retryCount < 3) {
          failedItems.push({
            ...item,
            retryCount: item.retryCount + 1,
          });
        } else {
          logger.error('Item exceeded retry limit, discarding', { id: item.id });
        }
      }
    }

    this.syncQueue = failedItems;
    await this.saveQueue();
    this.isSyncing = false;

    logger.info('Sync queue processed', { remaining: failedItems.length });
  }

  private async syncItem(item: SyncItem): Promise<void> {
    switch (item.type) {
      case 'stamp':
        await this.syncStamp(item);
        break;
      case 'card':
        await this.syncCard(item);
        break;
      case 'redemption':
        await this.syncRedemption(item);
        break;
      default:
        throw new Error(`Unknown sync type: ${item.type}`);
    }
  }

  private async syncStamp(item: SyncItem): Promise<void> {
    const { stamp_card_id, method } = item.data;

    const { data: card } = await supabase
      .from('stamp_cards')
      .select('stamps_collected, stamps_required')
      .eq('id', stamp_card_id)
      .single();

    if (!card) throw new Error('Card not found');

    const newStampsCollected = card.stamps_collected + 1;
    const isCompleted = newStampsCollected >= card.stamps_required;

    await supabase.from('stamps').insert({
      stamp_card_id,
      method,
      collected_at: new Date(item.timestamp).toISOString(),
    });

    await supabase
      .from('stamp_cards')
      .update({
        stamps_collected: newStampsCollected,
        is_completed: isCompleted,
      })
      .eq('id', stamp_card_id);
  }

  private async syncCard(item: SyncItem): Promise<void> {
    if (item.action === 'create') {
      await supabase.from('stamp_cards').insert(item.data);
    } else if (item.action === 'update') {
      await supabase
        .from('stamp_cards')
        .update(item.data)
        .eq('id', item.data.id);
    }
  }

  private async syncRedemption(item: SyncItem): Promise<void> {
    await supabase.from('redemptions').insert(item.data);
  }

  // Cache management
  async cacheData(key: string, data: any, ttl?: number): Promise<void> {
    try {
      const cacheItem = {
        data,
        timestamp: Date.now(),
        ttl: ttl || 3600000, // Default 1 hour
      };
      await AsyncStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(cacheItem));
    } catch (error) {
      logger.error('Failed to cache data', { key, error });
    }
  }

  async getCachedData(key: string): Promise<any | null> {
    try {
      const cached = await AsyncStorage.getItem(`${CACHE_PREFIX}${key}`);
      if (!cached) return null;

      const cacheItem = JSON.parse(cached);
      const age = Date.now() - cacheItem.timestamp;

      if (age > cacheItem.ttl) {
        // Cache expired
        await AsyncStorage.removeItem(`${CACHE_PREFIX}${key}`);
        return null;
      }

      return cacheItem.data;
    } catch (error) {
      logger.error('Failed to get cached data', { key, error });
      return null;
    }
  }

  async clearCache(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter((key) => key.startsWith(CACHE_PREFIX));
      await AsyncStorage.multiRemove(cacheKeys);
      logger.info('Cache cleared', { count: cacheKeys.length });
    } catch (error) {
      logger.error('Failed to clear cache', error);
    }
  }

  getQueueSize(): number {
    return this.syncQueue.length;
  }

  isCurrentlyOnline(): boolean {
    return this.isOnline;
  }
}

export const offlineSyncService = new OfflineSyncService();
export default offlineSyncService;
