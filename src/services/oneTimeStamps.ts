/**
 * OneStamps Service
 * Handles validation and claiming of one-time use stamps
 */

import { supabase } from './supabase';

export interface OneTimeStamp {
  id: string;
  business_id: string;
  stamp_code: string;
  status: 'active' | 'used' | 'expired';
  used_by_user_id: string | null;
  used_at: string | null;
  stamp_card_id: string | null;
  created_at: string;
  expires_at: string;
}

export interface ClaimStampResult {
  success: boolean;
  message: string;
  stamps_collected?: number;
  stamps_required?: number;
  is_completed?: boolean;
  business_name?: string;
  used_at?: string;
  expired_at?: string;
}

/**
 * Validates a one-time stamp code
 * This checks if the stamp exists and is still valid (not used, not expired)
 */
export async function validateOneTimeStamp(
  stampCode: string
): Promise<{ valid: boolean; message: string; stamp?: OneTimeStamp }> {
  try {
    // Fetch the stamp from database
    const { data: stamp, error } = await supabase
      .from('one_time_stamps')
      .select('*, businesses(name)')
      .eq('stamp_code', stampCode)
      .single();

    if (error || !stamp) {
      return {
        valid: false,
        message: 'Invalid stamp code. This QR code is not recognized.',
      };
    }

    // Check if already used
    if (stamp.status === 'used') {
      return {
        valid: false,
        message: `This stamp was already used${
          stamp.used_at
            ? ' on ' + new Date(stamp.used_at).toLocaleDateString()
            : ''
        }`,
        stamp,
      };
    }

    // Check if expired
    const expiryDate = new Date(stamp.expires_at);
    const now = new Date();

    if (expiryDate < now || stamp.status === 'expired') {
      return {
        valid: false,
        message: `This stamp expired on ${expiryDate.toLocaleDateString()}`,
        stamp,
      };
    }

    // Stamp is valid!
    return {
      valid: true,
      message: 'Stamp is valid and ready to claim!',
      stamp,
    };
  } catch (error) {
    console.error('Error validating stamp:', error);
    return {
      valid: false,
      message: 'Error validating stamp. Please try again.',
    };
  }
}

/**
 * Claims a one-time stamp for the current user
 * This uses the database function to ensure atomic operation
 */
export async function claimOneTimeStamp(
  stampCode: string,
  userId: string
): Promise<ClaimStampResult> {
  try {
    // Call the database function (atomic operation)
    const { data, error } = await supabase.rpc('claim_one_time_stamp', {
      p_stamp_code: stampCode,
      p_user_id: userId,
    });

    if (error) {
      console.error('Error claiming stamp:', error);
      return {
        success: false,
        message: 'Failed to claim stamp. Please try again.',
      };
    }

    // The function returns a JSON object with the result
    return data as ClaimStampResult;
  } catch (error) {
    console.error('Unexpected error claiming stamp:', error);
    return {
      success: false,
      message: 'An unexpected error occurred. Please try again.',
    };
  }
}

/**
 * Quick helper to check if a QR code is a one-time stamp
 * Returns true if the code starts with "STAMP_"
 */
export function isOneTimeStamp(qrCode: string): boolean {
  return qrCode.startsWith('STAMP_');
}

/**
 * Get all stamps for a specific business (for business owners)
 * This is useful if you want to add business analytics to your app later
 */
export async function getBusinessStamps(businessId: string) {
  try {
    const { data, error } = await supabase
      .from('one_time_stamps')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    console.error('Error fetching business stamps:', error);
    return { data: null, error };
  }
}

/**
 * Get statistics for business stamps
 */
export async function getBusinessStampStats(businessId: string) {
  try {
    const { data, error } = await supabase
      .from('one_time_stamps')
      .select('status')
      .eq('business_id', businessId);

    if (error) throw error;

    const stats = {
      total: data.length,
      active: data.filter((s) => s.status === 'active').length,
      used: data.filter((s) => s.status === 'used').length,
      expired: data.filter((s) => s.status === 'expired').length,
    };

    return { data: stats, error: null };
  } catch (error) {
    console.error('Error fetching stats:', error);
    return { data: null, error };
  }
}

/**
 * Check how many one-time stamps a user has claimed in the last hour
 * This is used for rate limiting to prevent abuse
 */
export async function checkUserRateLimit(userId: string): Promise<boolean> {
  try {
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);

    const { data, error } = await supabase
      .from('one_time_stamps')
      .select('id')
      .eq('used_by_user_id', userId)
      .gte('used_at', oneHourAgo.toISOString());

    if (error) throw error;

    // Allow max 10 stamps per hour
    const MAX_STAMPS_PER_HOUR = 10;
    return data.length < MAX_STAMPS_PER_HOUR;
  } catch (error) {
    console.error('Error checking rate limit:', error);
    return true; // Allow on error to not block users
  }
}
