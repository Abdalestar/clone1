import NfcManager, { NfcTech, Ndef } from 'react-native-nfc-manager';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

export interface NFCTag {
  id: string;
  data: string;
  uid: string;
}

class NFCService {
  private isInitialized = false;
  
  /**
   * Check if running in Expo Go (which doesn't support NFC native modules)
   */
  private isExpoGo(): boolean {
    return Constants.appOwnership === 'expo';
  }

  /**
   * Initialize NFC Manager
   */
  async init(): Promise<boolean> {
    try {
      // Skip initialization in Expo Go
      if (this.isExpoGo()) {
        return false;
      }
      
      const supported = await NfcManager.isSupported();
      if (supported) {
        await NfcManager.start();
        this.isInitialized = true;
      }
      return supported;
    } catch (error) {
      console.error('NFC init error:', error);
      return false;
    }
  }

  /**
   * Check if NFC is supported on device
   */
  async isSupported(): Promise<boolean> {
    try {
      // NFC is not available in Expo Go - requires a dev build or production app
      if (this.isExpoGo()) {
        console.log('NFC not available: Running in Expo Go. Build a custom dev client to use NFC.');
        return false;
      }
      
      return await NfcManager.isSupported();
    } catch (error) {
      console.log('NFC check error:', error);
      return false;
    }
  }

  /**
   * Check if NFC is enabled
   */
  async isEnabled(): Promise<boolean> {
    try {
      if (!this.isInitialized) {
        await this.init();
      }
      return await NfcManager.isEnabled();
    } catch (error) {
      return false;
    }
  }

  /**
   * Start reading NFC tags
   */
  async startReading(onTagDiscovered: (tag: NFCTag) => void): Promise<void> {
    try {
      if (!this.isInitialized) {
        await this.init();
      }

      await NfcManager.requestTechnology(NfcTech.Ndef, {
        alertMessage: 'Hold your phone near the business terminal',
      });

      const tag = await NfcManager.getTag();
      
      if (tag) {
        let data = '';
        const uid = tag.id || 'unknown';
        
        // Extract data from NDEF message
        if (tag.ndefMessage && tag.ndefMessage.length > 0) {
          const ndefRecord = tag.ndefMessage[0];
          if (ndefRecord.payload) {
            // Decode payload (skip first 3 bytes for text records)
            const payloadBytes = ndefRecord.payload.slice(3);
            data = String.fromCharCode(...payloadBytes);
          }
        }

        // Fallback to tag ID if no NDEF data
        if (!data && tag.id) {
          data = `NFC_${tag.id}`;
        }

        onTagDiscovered({
          id: tag.id || 'unknown',
          data: data || '',
          uid: uid,
        });
      }
    } catch (error) {
      console.error('NFC read error:', error);
      throw error;
    } finally {
      await this.stopReading();
    }
  }

  /**
   * Stop reading NFC tags
   */
  async stopReading(): Promise<void> {
    try {
      await NfcManager.cancelTechnologyRequest();
    } catch (error) {
      console.error('Stop NFC error:', error);
    }
  }

  /**
   * Write data to NFC tag (for business setup)
   */
  async writeTag(data: string): Promise<boolean> {
    try {
      if (!this.isInitialized) {
        await this.init();
      }

      await NfcManager.requestTechnology(NfcTech.Ndef);

      const bytes = Ndef.encodeMessage([
        Ndef.textRecord(data),
      ]);

      if (bytes) {
        await NfcManager.ndefHandler.writeNdefMessage(bytes);
        return true;
      }

      return false;
    } catch (error) {
      console.error('NFC write error:', error);
      return false;
    } finally {
      await this.stopReading();
    }
  }

  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    try {
      await this.stopReading();
      if (Platform.OS === 'android') {
        await NfcManager.unregisterTagEvent();
      }
    } catch (error) {
      console.error('NFC cleanup error:', error);
    }
  }
}

export default new NFCService();
