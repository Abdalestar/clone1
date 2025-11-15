import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { StaffSession } from '../types';

const SESSION_KEY = 'staff_session';
const SESSION_EXPIRY_KEY = 'staff_session_expiry';

export async function loginWithPIN(email: string, pin: string): Promise<{
  success: boolean;
  message: string;
  session?: StaffSession;
}> {
  try {
    const { data, error } = await supabase.rpc('validate_staff_pin', {
      p_email: email,
      p_pin: pin,
    });

    if (error) {
      console.error('Login error:', error);
      return {
        success: false,
        message: 'Login failed. Please try again.',
      };
    }

    if (!data.success) {
      return {
        success: false,
        message: data.message || 'Invalid credentials',
      };
    }

    const session: StaffSession = {
      staff_id: data.staff_id,
      merchant_id: data.merchant_id,
      name: data.name,
      role: data.role,
      permissions: data.permissions,
      session_token: data.session_token,
      expires_at: data.expires_at,
    };

    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
    await AsyncStorage.setItem(SESSION_EXPIRY_KEY, session.expires_at);

    return {
      success: true,
      message: 'Login successful',
      session,
    };
  } catch (error) {
    console.error('Login exception:', error);
    return {
      success: false,
      message: 'An error occurred during login',
    };
  }
}

export async function getStoredSession(): Promise<StaffSession | null> {
  try {
    const sessionJson = await AsyncStorage.getItem(SESSION_KEY);
    const expiry = await AsyncStorage.getItem(SESSION_EXPIRY_KEY);

    if (!sessionJson || !expiry) {
      return null;
    }

    const expiryDate = new Date(expiry);
    if (expiryDate < new Date()) {
      await logout();
      return null;
    }

    return JSON.parse(sessionJson);
  } catch (error) {
    console.error('Error retrieving session:', error);
    return null;
  }
}

export async function logout(): Promise<void> {
  try {
    await AsyncStorage.removeItem(SESSION_KEY);
    await AsyncStorage.removeItem(SESSION_EXPIRY_KEY);
  } catch (error) {
    console.error('Error during logout:', error);
  }
}

export async function isSessionValid(): Promise<boolean> {
  const session = await getStoredSession();
  return session !== null;
}

export function hasPermission(session: StaffSession | null, permission: keyof StaffSession['permissions']): boolean {
  if (!session) return false;
  return session.permissions[permission] === true;
}

export function isManager(session: StaffSession | null): boolean {
  if (!session) return false;
  return session.role === 'manager' || session.role === 'owner';
}

export function isOwner(session: StaffSession | null): boolean {
  if (!session) return false;
  return session.role === 'owner';
}
