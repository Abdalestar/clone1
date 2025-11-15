import NfcManager, { NfcTech, Ndef } from 'react-native-nfc-manager';
import { Platform } from 'react-native';

class NFCService {
  private isInitialized = false;
  private isSupported = false;

  async initialize(): Promise<boolean> {
    if (this.isInitialized) {
      return this.isSupported;
    }

    try {
      const supported = await NfcManager.isSupported();
      this.isSupported = supported;

      if (supported) {
        await NfcManager.start();
        this.isInitialized = true;
      }

      return supported;
    } catch (error) {
      console.error('NFC initialization error:', error);
      this.isSupported = false;
      return false;
    }
  }

  async writeStampToTag(stampCode: string): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      if (!this.isSupported) {
        return {
          success: false,
          message: 'NFC is not supported on this device',
        };
      }

      await NfcManager.requestTechnology(NfcTech.Ndef);

      const bytes = Ndef.encodeMessage([
        Ndef.textRecord(stampCode),
      ]);

      if (bytes) {
        await NfcManager.ndefHandler.writeNdefMessage(bytes);
      }

      await NfcManager.cancelTechnologyRequest();

      return {
        success: true,
        message: 'Stamp written to tag successfully',
      };
    } catch (error: any) {
      console.error('NFC write error:', error);

      try {
        await NfcManager.cancelTechnologyRequest();
      } catch (cancelError) {
      }

      if (error.toString().includes('cancelled') || error.toString().includes('timeout')) {
        return {
          success: false,
          message: 'NFC write cancelled or timed out. Please try again.',
        };
      }

      return {
        success: false,
        message: 'Failed to write to NFC tag. Please try again.',
      };
    }
  }

  async stopReading(): Promise<void> {
    try {
      await NfcManager.cancelTechnologyRequest();
    } catch (error) {
      console.error('Error stopping NFC:', error);
    }
  }

  async cleanup(): Promise<void> {
    try {
      await this.stopReading();
      if (this.isInitialized) {
        await NfcManager.unregisterTagEvent();
      }
    } catch (error) {
      console.error('NFC cleanup error:', error);
    }
  }

  isAvailable(): boolean {
    return this.isSupported && Platform.OS === 'android';
  }
}

const nfcService = new NFCService();
export default nfcService;
