import * as Crypto from 'expo-crypto';

// Secret key for HMAC signing - in production, fetch from Supabase config
const SECRET_KEY = process.env.PAYLOAD_SECRET || 'loyalty-stamp-secret-2024';

export interface StampPayload {
  businessId: string;
  timestamp: number;
  nonce: string;
  signature: string;
}

/**
 * Generate HMAC signature for payload
 */
export const generateSignature = async (data: string): Promise<string> => {
  const hash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `${SECRET_KEY}:${data}`
  );
  return hash;
};

/**
 * Verify payload signature
 */
export const verifySignature = async (
  data: string,
  signature: string
): Promise<boolean> => {
  const expectedSignature = await generateSignature(data);
  return expectedSignature === signature;
};

/**
 * Encode stamp payload for QR/NFC
 */
export const encodePayload = async (
  businessId: string
): Promise<string> => {
  const timestamp = Date.now();
  const nonce = Math.random().toString(36).substring(2, 15);
  const data = `${businessId}:${timestamp}:${nonce}`;
  const signature = await generateSignature(data);
  
  const payload: StampPayload = {
    businessId,
    timestamp,
    nonce,
    signature,
  };
  
  return `STAMP:${Buffer.from(JSON.stringify(payload)).toString('base64')}`;
};

/**
 * Decode and verify stamp payload from QR/NFC
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
          signature: 'legacy',
        },
      };
    }

    // Decode base64
    const base64Data = encodedData.replace('STAMP:', '');
    const jsonString = Buffer.from(base64Data, 'base64').toString('utf-8');
    const payload: StampPayload = JSON.parse(jsonString);

    // Verify signature
    const data = `${payload.businessId}:${payload.timestamp}:${payload.nonce}`;
    const isValid = await verifySignature(data, payload.signature);

    if (!isValid) {
      return { valid: false, error: 'Invalid signature' };
    }

    // Check timestamp (payload valid for 5 minutes)
    const now = Date.now();
    const age = now - payload.timestamp;
    const MAX_AGE = 5 * 60 * 1000; // 5 minutes

    if (age > MAX_AGE) {
      return { valid: false, error: 'Payload expired' };
    }

    if (age < 0) {
      return { valid: false, error: 'Invalid timestamp' };
    }

    return { valid: true, payload };
  } catch (error: any) {
    return { valid: false, error: error.message || 'Invalid payload format' };
  }
};

/**
 * Generate test payload for development
 */
export const generateTestPayload = async (businessId: string): Promise<string> => {
  return encodePayload(businessId);
};

/**
 * Check if payload is duplicate (to prevent replay attacks)
 */
export const isDuplicatePayload = async (
  nonce: string,
  userId: string
): Promise<boolean> => {
  // In production, check against database of used nonces
  // For now, just return false
  // TODO: Implement nonce tracking in Supabase
  return false;
};
