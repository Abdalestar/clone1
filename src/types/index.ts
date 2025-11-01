export interface User {
  id: string;
  email: string;
  username: string;
  full_name: string;
  phone_number: string;
  avatar_url?: string;
  preferences?: string[];
  created_at: string;
}

export interface Business {
  id: string;
  name: string;
  category: string;
  description: string;
  logo_url: string;
  latitude: number;
  longitude: number;
  address: string;
  rating: number;
  stamps_required: number;
  reward_description: string;
  nfc_tag_id?: string;
  qr_code?: string;
  created_at: string;
}

export interface StampCard {
  id: string;
  user_id: string;
  business_id: string;
  business?: Business;
  stamps_collected: number;
  stamps_required: number;
  is_completed: boolean;
  created_at: string;
  expires_at?: string;
}

export interface Stamp {
  id: string;
  stamp_card_id: string;
  collected_at: string;
  method: 'nfc' | 'qr' | 'manual';
}

export interface Redemption {
  id: string;
  user_id: string;
  stamp_card_id: string;
  business_id: string;
  redeemed_at: string;
  reward_description: string;
}

export type Category = 'coffee' | 'restaurant' | 'gym' | 'salon' | 'retail' | 'spa' | 'all';
