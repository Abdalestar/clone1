import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { supabase } from './supabase';
import logger from '../utils/logger';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export interface NotificationData {
  type: 'stamp' | 'reward' | 'promotion' | 'reminder';
  title: string;
  body: string;
  data?: Record<string, any>;
}

class NotificationService {
  private expoPushToken: string | null = null;

  async registerForPushNotifications(): Promise<string | null> {
    if (!Device.isDevice) {
      logger.warn('Push notifications only work on physical devices');
      return null;
    }

    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        logger.warn('Push notification permission not granted');
        return null;
      }

      const token = await Notifications.getExpoPushTokenAsync({
        projectId: Constants.expoConfig?.extra?.eas?.projectId,
      });

      this.expoPushToken = token.data;
      logger.info('Push token registered', { token: token.data });

      // Configure Android channel
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF6B6B',
        });
      }

      return token.data;
    } catch (error) {
      logger.error('Failed to register for push notifications', error);
      return null;
    }
  }

  async savePushToken(userId: string, token: string): Promise<void> {
    try {
      await supabase
        .from('users')
        .update({ push_token: token })
        .eq('id', userId);

      logger.info('Push token saved to database', { userId });
    } catch (error) {
      logger.error('Failed to save push token', error);
    }
  }

  async scheduleLocalNotification(notification: NotificationData, delay: number = 0): Promise<string> {
    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: notification.title,
          body: notification.body,
          data: notification.data || {},
          sound: true,
        },
        trigger: delay > 0 ? { seconds: delay } : null,
      });

      logger.info('Local notification scheduled', { id: notificationId });
      return notificationId;
    } catch (error) {
      logger.error('Failed to schedule notification', error);
      throw error;
    }
  }

  async cancelNotification(notificationId: string): Promise<void> {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
      logger.info('Notification cancelled', { id: notificationId });
    } catch (error) {
      logger.error('Failed to cancel notification', error);
    }
  }

  async cancelAllNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      logger.info('All notifications cancelled');
    } catch (error) {
      logger.error('Failed to cancel all notifications', error);
    }
  }

  async getBadgeCount(): Promise<number> {
    try {
      return await Notifications.getBadgeCountAsync();
    } catch (error) {
      logger.error('Failed to get badge count', error);
      return 0;
    }
  }

  async setBadgeCount(count: number): Promise<void> {
    try {
      await Notifications.setBadgeCountAsync(count);
    } catch (error) {
      logger.error('Failed to set badge count', error);
    }
  }

  async clearBadge(): Promise<void> {
    await this.setBadgeCount(0);
  }

  // Notification templates
  async notifyStampCollected(businessName: string, stampsCollected: number, stampsRequired: number): Promise<void> {
    const remaining = stampsRequired - stampsCollected;

    await this.scheduleLocalNotification({
      type: 'stamp',
      title: '✅ Stamp Collected!',
      body: remaining > 0
        ? `${remaining} more stamp${remaining === 1 ? '' : 's'} needed at ${businessName}!`
        : `🎉 Card complete at ${businessName}! Redeem your reward now!`,
      data: { businessName, stampsCollected, stampsRequired },
    });
  }

  async notifyCardComplete(businessName: string, rewardDescription: string): Promise<void> {
    await this.scheduleLocalNotification({
      type: 'reward',
      title: '🎉 Reward Ready!',
      body: `Your ${businessName} card is complete! ${rewardDescription}`,
      data: { businessName, rewardDescription },
    });
  }

  async notifyCardExpiring(businessName: string, daysRemaining: number): Promise<void> {
    await this.scheduleLocalNotification({
      type: 'reminder',
      title: '⏰ Card Expiring Soon',
      body: `Your ${businessName} card expires in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}!`,
      data: { businessName, daysRemaining },
    });
  }

  async notifyPromotion(title: string, message: string, businessId?: string): Promise<void> {
    await this.scheduleLocalNotification({
      type: 'promotion',
      title,
      body: message,
      data: { businessId },
    });
  }

  async scheduleReminderForNearbyBusiness(businessName: string, distance: number): Promise<void> {
    await this.scheduleLocalNotification({
      type: 'reminder',
      title: '📍 Nearby Business',
      body: `You're near ${businessName} (${Math.round(distance)}m away). Collect a stamp!`,
      data: { businessName, distance },
    });
  }

  setupNotificationListeners(
    onNotificationReceived?: (notification: Notifications.Notification) => void,
    onNotificationResponse?: (response: Notifications.NotificationResponse) => void
  ): () => void {
    const receivedSubscription = Notifications.addNotificationReceivedListener((notification) => {
      logger.info('Notification received', { notification });
      onNotificationReceived?.(notification);
    });

    const responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
      logger.info('Notification response received', { response });
      onNotificationResponse?.(response);
    });

    return () => {
      receivedSubscription.remove();
      responseSubscription.remove();
    };
  }

  getPushToken(): string | null {
    return this.expoPushToken;
  }
}

export const notificationService = new NotificationService();
export default notificationService;
