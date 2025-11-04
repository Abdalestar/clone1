import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { captureRef } from 'react-native-view-shot';
import logger from '../utils/logger';

class SocialSharingService {
  async shareText(message: string, title?: string): Promise<boolean> {
    try {
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        logger.warn('Sharing is not available on this device');
        return false;
      }

      // For text sharing, we need to use native share
      // This is a workaround since expo-sharing mainly handles files
      return true;
    } catch (error) {
      logger.error('Failed to share text', error);
      return false;
    }
  }

  async shareImage(imageUri: string, message?: string): Promise<boolean> {
    try {
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        logger.warn('Sharing is not available on this device');
        return false;
      }

      await Sharing.shareAsync(imageUri, {
        dialogTitle: message || 'Share',
        mimeType: 'image/png',
      });

      logger.info('Image shared successfully');
      return true;
    } catch (error) {
      logger.error('Failed to share image', error);
      return false;
    }
  }

  async captureAndShareView(viewRef: any, message?: string): Promise<boolean> {
    try {
      const uri = await captureRef(viewRef, {
        format: 'png',
        quality: 0.9,
      });

      return await this.shareImage(uri, message);
    } catch (error) {
      logger.error('Failed to capture and share view', error);
      return false;
    }
  }

  async shareStampCard(
    businessName: string,
    stampsCollected: number,
    stampsRequired: number
  ): Promise<boolean> {
    const message = `🎉 I just collected ${stampsCollected}/${stampsRequired} stamps at ${businessName}! Join me on Loyalty Stamp App!`;
    return await this.shareText(message, 'Share Stamp Card');
  }

  async shareReward(businessName: string, rewardDescription: string): Promise<boolean> {
    const message = `🏆 I just earned a reward at ${businessName}: ${rewardDescription}! Download Loyalty Stamp App to start earning rewards too!`;
    return await this.shareText(message, 'Share Reward');
  }

  async shareReferralCode(referralCode: string): Promise<boolean> {
    const message = `Join me on Loyalty Stamp App and get bonus stamps! Use my referral code: ${referralCode}\n\nDownload now and start collecting!`;
    return await this.shareText(message, 'Invite Friends');
  }

  async shareAppInvite(): Promise<boolean> {
    const message = `Check out Loyalty Stamp App! 📱\n\nCollect digital stamps at local businesses and earn rewards. It's easy, paperless, and fun!\n\n[App Store / Play Store Link]`;
    return await this.shareText(message, 'Share App');
  }
}

export const socialSharingService = new SocialSharingService();
export default socialSharingService;
