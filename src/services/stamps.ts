import { supabase } from './supabase';
import { StampCard, Stamp, Business } from '../types';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const getUserStampCards = async (userId: string): Promise<StampCard[]> => {
  try {
    const { data, error } = await supabase
      .from('stamp_cards')
      .select(`
        *,
        business:businesses(*)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as StampCard[];
  } catch (error) {
    console.error('Error fetching stamp cards:', error);
    return [];
  }
};

export const createStampCard = async (userId: string, businessId: string) => {
  try {
    // Check if card already exists
    const { data: existing } = await supabase
      .from('stamp_cards')
      .select('*')
      .eq('user_id', userId)
      .eq('business_id', businessId)
      .eq('is_completed', false)
      .single();

    if (existing) {
      return { data: existing, error: null };
    }

    // Get business info for stamps_required
    const { data: business } = await supabase
      .from('businesses')
      .select('stamps_required')
      .eq('id', businessId)
      .single();

    const { data, error } = await supabase
      .from('stamp_cards')
      .insert({
        user_id: userId,
        business_id: businessId,
        stamps_collected: 0,
        stamps_required: business?.stamps_required || 10,
        is_completed: false,
      })
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error: any) {
    return { data: null, error: error.message };
  }
};

export const addStamp = async (
  stampCardId: string,
  method: 'nfc' | 'qr' | 'manual'
) => {
  try {
    // Get current card
    const { data: card, error: cardError } = await supabase
      .from('stamp_cards')
      .select('*')
      .eq('id', stampCardId)
      .single();

    if (cardError) throw cardError;

    // Add stamp record
    const { error: stampError } = await supabase
      .from('stamps')
      .insert({
        stamp_card_id: stampCardId,
        method,
      });

    if (stampError) throw stampError;

    // Update card
    const newStampCount = card.stamps_collected + 1;
    const isCompleted = newStampCount >= card.stamps_required;

    const { data, error: updateError } = await supabase
      .from('stamp_cards')
      .update({
        stamps_collected: newStampCount,
        is_completed: isCompleted,
      })
      .eq('id', stampCardId)
      .select()
      .single();

    if (updateError) throw updateError;

    return { data, error: null, isCompleted };
  } catch (error: any) {
    return { data: null, error: error.message, isCompleted: false };
  }
};

export const redeemCard = async (stampCardId: string, userId: string) => {
  try {
    const { data: card } = await supabase
      .from('stamp_cards')
      .select('*, business:businesses(*)')
      .eq('id', stampCardId)
      .single();

    if (!card || !card.is_completed) {
      throw new Error('Card not ready for redemption');
    }

    // Create redemption record
    const { data, error } = await supabase
      .from('redemptions')
      .insert({
        user_id: userId,
        stamp_card_id: stampCardId,
        business_id: card.business_id,
        reward_description: card.business?.reward_description || 'Free item',
      })
      .select()
      .single();

    if (error) throw error;

    // Archive the card (or delete)
    await supabase
      .from('stamp_cards')
      .delete()
      .eq('id', stampCardId);

    return { data, error: null };
  } catch (error: any) {
    return { data: null, error: error.message };
  }
};

export const getAllBusinesses = async (): Promise<Business[]> => {
  try {
    const { data, error } = await supabase
      .from('businesses')
      .select('*')
      .order('name');

    if (error) throw error;
    return data as Business[];
  } catch (error) {
    console.error('Error fetching businesses:', error);
    return [];
  }
};

export const getBusinessByNFC = async (nfcTagId: string): Promise<Business | null> => {
  try {
    const { data, error } = await supabase
      .from('businesses')
      .select('*')
      .eq('nfc_tag_id', nfcTagId)
      .single();

    if (error) throw error;
    return data as Business;
  } catch (error) {
    return null;
  }
};

export const getBusinessByQR = async (qrCode: string): Promise<Business | null> => {
  try {
    const { data, error } = await supabase
      .from('businesses')
      .select('*')
      .eq('qr_code', qrCode)
      .single();

    if (error) throw error;
    return data as Business;
  } catch (error) {
    return null;
  }
};
