export interface StaffMember {
  id: string;
  merchant_id: string;
  name: string;
  email: string;
  phone: string | null;
  role: 'owner' | 'manager' | 'staff';
  permissions: StaffPermissions;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
}

export interface StaffPermissions {
  can_issue_stamps: boolean;
  can_void_stamps: boolean;
  can_view_analytics: boolean;
  can_manage_inventory: boolean;
  can_manage_staff: boolean;
}

export interface StaffSession {
  staff_id: string;
  merchant_id: string;
  name: string;
  role: 'owner' | 'manager' | 'staff';
  permissions: StaffPermissions;
  session_token: string;
  expires_at: string;
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
  staff_settings: StaffSettings;
  created_at: string;
}

export interface StaffSettings {
  auto_generate_threshold: number;
  auto_generate_quantity: number;
  auto_generate_enabled: boolean;
  default_nfc_expiry_minutes: number;
  default_qr_expiry_minutes: number;
}

export interface OneTimeStamp {
  id: string;
  business_id: string;
  stamp_code: string;
  status: 'active' | 'used' | 'expired';
  issued_by_staff_id: string | null;
  is_written_to_tag: boolean;
  is_generated_as_qr: boolean;
  used_by_user_id: string | null;
  used_at: string | null;
  stamp_card_id: string | null;
  voided_by_staff_id: string | null;
  voided_at: string | null;
  void_reason: string | null;
  created_at: string;
  expires_at: string;
}

export interface StampTransaction {
  id: string;
  merchant_id: string;
  stamp_code: string | null;
  customer_id: string | null;
  staff_id: string | null;
  transaction_type: 'stamp_issued' | 'stamp_redeemed' | 'stamp_voided' | 'reward_redeemed';
  method: 'nfc' | 'qr' | null;
  metadata: Record<string, any>;
  created_at: string;
  customer?: CustomerInfo;
  staff?: { name: string };
}

export interface CustomerInfo {
  id: string;
  name: string;
  phone: string;
  email: string;
}

export interface DashboardStats {
  stamps_issued_today: number;
  customers_served_today: number;
  rewards_redeemed_today: number;
  available_stamps: number;
}

export interface InventoryStats {
  available: number;
  issued_today: number;
  used_today: number;
  expired: number;
}

export interface StampCard {
  id: string;
  user_id: string;
  business_id: string;
  stamps_collected: number;
  stamps_required: number;
  is_completed: boolean;
  created_at: string;
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  phone_number: string;
  created_at: string;
}
