import { supabase } from './supabase';
import { OneTimeStamp, StaffSession } from '../types';
import AsyncStorage from '@react-native-async-storage/async-storage';

const OFFLINE_QUEUE_KEY = 'offline_stamp_queue';

interface FetchStampResult {
  success: boolean;
  message: string;
  stamp?: OneTimeStamp;
}

interface MarkStampIssuedResult {
  success: boolean;
  message: string;
}

export async function fetchAvailableStamp(
  merchantId: string,
  expiryMinutes: number = 5
): Promise<FetchStampResult> {
  try {
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + expiryMinutes);

    const { data: stamps, error } = await supabase
      .from('one_time_stamps')
      .select('*')
      .eq('business_id', merchantId)
      .eq('status', 'active')
      .is('issued_by_staff_id', null)
      .gt('expires_at', new Date().toISOString())
      .limit(1);

    if (error) {
      console.error('Error fetching stamp:', error);
      return {
        success: false,
        message: 'Failed to fetch stamp from inventory',
      };
    }

    if (!stamps || stamps.length === 0) {
      return {
        success: false,
        message: 'No stamps available in inventory. Please generate more stamps.',
      };
    }

    return {
      success: true,
      message: 'Stamp fetched successfully',
      stamp: stamps[0] as OneTimeStamp,
    };
  } catch (error) {
    console.error('Exception fetching stamp:', error);
    return {
      success: false,
      message: 'An error occurred while fetching stamp',
    };
  }
}

export async function markStampAsIssued(
  stampId: string,
  staffId: string,
  method: 'nfc' | 'qr'
): Promise<MarkStampIssuedResult> {
  try {
    const isNFC = method === 'nfc';

    const { error } = await supabase
      .from('one_time_stamps')
      .update({
        issued_by_staff_id: staffId,
        is_written_to_tag: isNFC,
        is_generated_as_qr: !isNFC,
      })
      .eq('id', stampId);

    if (error) {
      console.error('Error marking stamp as issued:', error);
      return {
        success: false,
        message: 'Failed to mark stamp as issued',
      };
    }

    return {
      success: true,
      message: 'Stamp marked as issued',
    };
  } catch (error) {
    console.error('Exception marking stamp:', error);
    return {
      success: false,
      message: 'An error occurred while marking stamp',
    };
  }
}

export async function logTransaction(
  merchantId: string,
  staffId: string,
  stampCode: string,
  transactionType: 'stamp_issued',
  method: 'nfc' | 'qr'
): Promise<void> {
  try {
    await supabase
      .from('stamp_transactions')
      .insert({
        merchant_id: merchantId,
        staff_id: staffId,
        stamp_code: stampCode,
        transaction_type: transactionType,
        method: method,
        metadata: { issued_at: new Date().toISOString() },
      });
  } catch (error) {
    console.error('Error logging transaction:', error);
  }
}

export async function issueStamp(
  session: StaffSession,
  method: 'nfc' | 'qr',
  expiryMinutes?: number
): Promise<{ success: boolean; message: string; stamp?: OneTimeStamp }> {
  const defaultExpiry = method === 'nfc' ? 5 : 2;
  const expiry = expiryMinutes || defaultExpiry;

  const fetchResult = await fetchAvailableStamp(session.merchant_id, expiry);

  if (!fetchResult.success || !fetchResult.stamp) {
    return fetchResult;
  }

  const markResult = await markStampAsIssued(
    fetchResult.stamp.id,
    session.staff_id,
    method
  );

  if (!markResult.success) {
    return {
      success: false,
      message: markResult.message,
    };
  }

  await logTransaction(
    session.merchant_id,
    session.staff_id,
    fetchResult.stamp.stamp_code,
    'stamp_issued',
    method
  );

  return {
    success: true,
    message: 'Stamp issued successfully',
    stamp: fetchResult.stamp,
  };
}

export async function queueOfflineStamp(stamp: OneTimeStamp, method: 'nfc' | 'qr'): Promise<void> {
  try {
    const queueJson = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
    const queue = queueJson ? JSON.parse(queueJson) : [];

    queue.push({
      stamp,
      method,
      timestamp: new Date().toISOString(),
    });

    await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
  } catch (error) {
    console.error('Error queuing offline stamp:', error);
  }
}

export async function syncOfflineStamps(session: StaffSession): Promise<number> {
  try {
    const queueJson = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
    if (!queueJson) return 0;

    const queue = JSON.parse(queueJson);
    let synced = 0;

    for (const item of queue) {
      const result = await markStampAsIssued(item.stamp.id, session.staff_id, item.method);
      if (result.success) {
        await logTransaction(
          session.merchant_id,
          session.staff_id,
          item.stamp.stamp_code,
          'stamp_issued',
          item.method
        );
        synced++;
      }
    }

    await AsyncStorage.removeItem(OFFLINE_QUEUE_KEY);
    return synced;
  } catch (error) {
    console.error('Error syncing offline stamps:', error);
    return 0;
  }
}

export async function getOfflineQueueCount(): Promise<number> {
  try {
    const queueJson = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
    if (!queueJson) return 0;
    const queue = JSON.parse(queueJson);
    return queue.length;
  } catch (error) {
    return 0;
  }
}
