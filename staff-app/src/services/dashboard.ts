import { supabase } from './supabase';
import { DashboardStats, StampTransaction } from '../types';

export async function getDashboardStats(merchantId: string): Promise<DashboardStats> {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [transactionsResult, stampsResult] = await Promise.all([
      supabase
        .from('stamp_transactions')
        .select('transaction_type')
        .eq('merchant_id', merchantId)
        .gte('created_at', today.toISOString()),
      supabase
        .from('one_time_stamps')
        .select('status')
        .eq('business_id', merchantId)
        .eq('status', 'active')
        .is('issued_by_staff_id', null),
    ]);

    const transactions = transactionsResult.data || [];
    const stamps = stampsResult.data || [];

    const stamps_issued_today = transactions.filter(
      t => t.transaction_type === 'stamp_issued'
    ).length;

    const rewards_redeemed_today = transactions.filter(
      t => t.transaction_type === 'reward_redeemed'
    ).length;

    const customers_served_today = new Set(
      transactions.map(t => t.transaction_type)
    ).size;

    const available_stamps = stamps.length;

    return {
      stamps_issued_today,
      customers_served_today,
      rewards_redeemed_today,
      available_stamps,
    };
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return {
      stamps_issued_today: 0,
      customers_served_today: 0,
      rewards_redeemed_today: 0,
      available_stamps: 0,
    };
  }
}

export async function getRecentTransactions(
  merchantId: string,
  limit: number = 4
): Promise<StampTransaction[]> {
  try {
    const { data, error } = await supabase
      .from('stamp_transactions')
      .select(`
        *,
        customer:users!customer_id(full_name, phone_number, email),
        staff:staff_members!staff_id(name)
      `)
      .eq('merchant_id', merchantId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching transactions:', error);
      return [];
    }

    return (data || []).map(t => ({
      ...t,
      customer: t.customer ? {
        id: t.customer_id || '',
        name: t.customer.full_name,
        phone: t.customer.phone_number,
        email: t.customer.email,
      } : undefined,
      staff: t.staff ? { name: t.staff.name } : undefined,
    }));
  } catch (error) {
    console.error('Exception fetching transactions:', error);
    return [];
  }
}

export async function getAllTransactions(
  merchantId: string,
  filters?: {
    startDate?: Date;
    endDate?: Date;
    staffId?: string;
    transactionType?: string;
  }
): Promise<StampTransaction[]> {
  try {
    let query = supabase
      .from('stamp_transactions')
      .select(`
        *,
        customer:users!customer_id(full_name, phone_number, email),
        staff:staff_members!staff_id(name)
      `)
      .eq('merchant_id', merchantId)
      .order('created_at', { ascending: false });

    if (filters?.startDate) {
      query = query.gte('created_at', filters.startDate.toISOString());
    }

    if (filters?.endDate) {
      query = query.lte('created_at', filters.endDate.toISOString());
    }

    if (filters?.staffId) {
      query = query.eq('staff_id', filters.staffId);
    }

    if (filters?.transactionType) {
      query = query.eq('transaction_type', filters.transactionType);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching all transactions:', error);
      return [];
    }

    return (data || []).map(t => ({
      ...t,
      customer: t.customer ? {
        id: t.customer_id || '',
        name: t.customer.full_name,
        phone: t.customer.phone_number,
        email: t.customer.email,
      } : undefined,
      staff: t.staff ? { name: t.staff.name } : undefined,
    }));
  } catch (error) {
    console.error('Exception fetching all transactions:', error);
    return [];
  }
}
