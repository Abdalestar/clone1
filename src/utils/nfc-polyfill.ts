// NFC Polyfill Module
// This is a mock implementation for NFC functionality
// In production, you would use expo-nfc or react-native-nfc-manager

export const hasHardwareAsync = async (): Promise<boolean> => {
  // Mock: Return true for Android, false for iOS
  return Promise.resolve(true);
};

export const isEnabledAsync = async (): Promise<boolean> => {
  // Mock: Return true (assume NFC is enabled)
  return Promise.resolve(true);
};

export const setEventListenerAsync = async (listener: any): Promise<void> => {
  // Mock: Do nothing for now
  // In real implementation, this would listen for NFC tags
  console.log('NFC listener set (mock)');
  return Promise.resolve();
};

export default {
  hasHardwareAsync,
  isEnabledAsync,
  setEventListenerAsync,
};
