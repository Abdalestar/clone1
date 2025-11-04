import * as Crypto from 'expo-crypto';

export interface StampPayload {
  businessId: string;
  timestamp: number;
  nonce: string;
  signature?: string; // Optional - only verified server-side
}

/**
 * Generate a cryptographically secure nonce
 */
export const generateNonce = async (): Promise<string> => {
  const randomBytes = await Crypto.getRandomBytesAsync(16);
  return Array.from(randomBytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
};

/**
 * Encode stamp payload for QR/NFC (client-side)
 * Note: Signature verification happens server-side only
 */
export const encodePayload = async (
  businessId: string
): Promise<string> => {
  const timestamp = Date.now();
  const nonce = await generateNonce();

  const payload: StampPayload = {
    businessId,
    timestamp,
    nonce,
  };

  return `STAMP:${btoa(JSON.stringify(payload))}`;
};

/**
 * Decode stamp payload from QR/NFC (client-side parsing only)
 * Note: Full validation happens server-side via Supabase Edge Function
 */
export const decodePayload = async (
  encodedData: string
): Promise<{ valid: boolean; payload?: StampPayload; error?: string }> => {
  try {
    // Check if it's a new format payload
    if (!encodedData.startsWith('STAMP:')) {
      // Fallback to legacy QR codes (QR_XXX001 format)
      return {
        valid: true,
        payload: {
          businessId: encodedData,
          timestamp: Date.now(),
          nonce: 'legacy',
        },
      };
    }

    // Decode base64
    const base64Data = encodedData.replace('STAMP:', '');
    const jsonString = atob(base64Data);
    const payload: StampPayload = JSON.parse(jsonString);

    // Basic client-side validation (timestamp check only)
    const now = Date.now();
    const age = now - payload.timestamp;
    const MAX_AGE = 5 * 60 * 1000; // 5 minutes

    if (age > MAX_AGE) {
      return { valid: false, error: 'Payload expired' };
    }

    if (age < 0) {
      return { valid: false, error: 'Invalid timestamp' };
    }

    // Payload appears valid (final verification on server)
    return { valid: true, payload };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Invalid payload format';
    return { valid: false, error: errorMessage };
  }
};

/**
 * Generate test payload for development
 */
export const generateTestPayload = async (businessId: string): Promise<string> => {
  return encodePayload(businessId);
};

/**
 * Validate payload structure before sending to server
 */
export const validatePayloadStructure = (payload: StampPayload): boolean => {
  return !!(
    payload.businessId &&
    typeof payload.businessId === 'string' &&
    payload.timestamp &&
    typeof payload.timestamp === 'number' &&
    payload.nonce &&
    typeof payload.nonce === 'string'
  );
};
