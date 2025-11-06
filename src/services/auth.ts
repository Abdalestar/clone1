import { supabase } from './supabase';
import { User } from '../types';
import logger from '../utils/logger';

export interface SignUpData {
  email: string;
  password: string;
  username: string;
  full_name: string;
  phone_number: string;
}

export const signUp = async (data: SignUpData) => {
  try {
    logger.info('Starting signup process...', { email: data.email, username: data.username });
    
    // Sign up with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
    });

    if (authError) {
      logger.error('Supabase auth signup failed', { 
        error: authError,
        message: authError.message,
        status: authError.status 
      });
      throw authError;
    }
    
    if (!authData.user) {
      logger.error('No user returned from auth signup');
      throw new Error('No user returned from signup');
    }

    logger.info('Auth user created, creating profile...', { userId: authData.user.id });

    // Create user profile
    const { error: profileError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        email: data.email,
        username: data.username,
        full_name: data.full_name,
        phone_number: data.phone_number,
      });

    if (profileError) {
      logger.error('Profile creation failed', { 
        error: profileError,
        code: profileError.code,
        message: profileError.message,
        details: profileError.details,
        hint: profileError.hint 
      });
      
      // Provide user-friendly error messages for common issues
      if (profileError.code === '23505') {
        // Unique constraint violation
        if (profileError.message.includes('username')) {
          throw new Error('Username already taken. Please choose a different username.');
        }
        if (profileError.message.includes('email')) {
          throw new Error('Email already registered. Please login instead.');
        }
        throw new Error('This username or email is already taken.');
      }
      
      throw profileError;
    }

    logger.info('Signup successful', { userId: authData.user.id, email: data.email });
    return { user: authData.user, error: null };
  } catch (error) {
    logger.error('Signup error', error);
    const errorMessage = error instanceof Error ? error.message : 'An error occurred during sign up';
    return { user: null, error: errorMessage };
  }
};

export const signIn = async (email: string, password: string) => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    return { user: data.user, error: null };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An error occurred during sign in';
    return { user: null, error: errorMessage };
  }
};

export const signOut = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return { error: null };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An error occurred during sign out';
    return { error: errorMessage };
  }
};

export const getCurrentUser = async (): Promise<User | null> => {
  try {
    logger.info('Getting current user...');
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      logger.error('Failed to get auth user', authError);
      return null;
    }
    
    if (!user) {
      logger.info('No authenticated user found');
      return null;
    }

    logger.info('Auth user found, fetching profile...', { userId: user.id });

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) {
      logger.error('Failed to fetch user profile', { 
        error, 
        userId: user.id,
        errorCode: error.code,
        errorMessage: error.message 
      });
      
      // If profile doesn't exist (PGRST116 is "not found" error)
      if (error.code === 'PGRST116') {
        logger.error('User profile not found in public.users table', { 
          userId: user.id,
          email: user.email 
        });
        throw new Error('User profile not found. The account exists but profile data is missing. Please contact support.');
      }
      
      throw error;
    }
    
    if (!data) {
      logger.error('User profile query returned no data', { userId: user.id });
      throw new Error('User profile not found');
    }

    logger.info('User profile fetched successfully', { userId: user.id });
    return data as User;
  } catch (error) {
    logger.error('getCurrentUser error', error);
    
    // Re-throw the error so calling code can handle it
    if (error instanceof Error) {
      throw error;
    }
    
    return null;
  }
};
