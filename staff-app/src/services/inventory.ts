import { supabase } from './supabase';
import { InventoryStats } from '../types';

export async function generateStamps(
  merchantId: string,
  quantity: number,
  expiresInMinutes: number = 1440
): Promise<{ success: boolean; message: string; count?: number }> {
  try {
    const { data, error } = await supabase.rpc('generate_one_time_stamps', {
      p_merchant_id: merchantId,
      p_quantity: quantity,
      p_expires_in_minutes: expiresInMinutes,
    });

    if (error) {
      console.error('Error generating stamps:', error);
      return {
        success: false,
        message: 'Failed to generate stamps',
      };
    }

    return {
      success: data.success,
      message: data.message,
      count: data.count,
    };
  } catch (error) {
    console.error('Exception generating stamps:', error);
    return {
      success: false,
      message: 'An error occurred while generating stamps',
    };
  }
}

export async function getInventoryStats(merchantId: string): Promise<InventoryStats> {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data: stamps, error } = await supabase
      .from('one_time_stamps')
      .select('status, created_at, used_at')
      .eq('business_id', merchantId);

    if (error) {
      console.error('Error fetching inventory stats:', error);
      return {
        available: 0,
        issued_today: 0,
        used_today: 0,
        expired: 0,
      };
    }

    const now = new Date();
    const available = stamps.filter(
      s => s.status === 'active' && new Date(s.created_at) < now
    ).length;

    const issued_today = stamps.filter(s => {
      if (!s.used_at) return false;
      const usedDate = new Date(s.used_at);
      return usedDate >= today;
    }).length;

    const used_today = stamps.filter(s => {
      if (s.status !== 'used' || !s.used_at) return false;
      const usedDate = new Date(s.used_at);
      return usedDate >= today;
    }).length;

    const expired = stamps.filter(s => s.status === 'expired').length;

    return {
      available,
      issued_today,
      used_today,
      expired,
    };
  } catch (error) {
    console.error('Exception fetching inventory stats:', error);
    return {
      available: 0,
      issued_today: 0,
      used_today: 0,
      expired: 0,
    };
  }
}

export async function checkLowInventory(
  merchantId: string,
  threshold: number = 50
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('one_time_stamps')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', merchantId)
      .eq('status', 'active')
      .is('issued_by_staff_id', null);

    if (error) {
      console.error('Error checking inventory:', error);
      return false;
    }

    return (data?.length || 0) < threshold;
  } catch (error) {
    console.error('Exception checking inventory:', error);
    return false;
  }
}
