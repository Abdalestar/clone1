import { create } from 'zustand';
import { User } from '../types';
import { getCurrentUser, signIn, signOut, signUp, SignUpData } from '../services/auth';
import logger from '../utils/logger';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  // Actions
  setUser: (user: User | null) => void;
  login: (email: string, password: string) => Promise<{ error: string | null }>;
  signup: (data: SignUpData) => Promise<{ error: string | null }>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

  setUser: (user) => set({
    user,
    isAuthenticated: !!user,
    isLoading: false,
  }),

  login: async (email, password) => {
    try {
      logger.info('Attempting login...');
      set({ isLoading: true });
      
      const { user, error } = await signIn(email, password);
      
      if (error) {
        logger.error('Login failed', error);
        set({ isLoading: false });
        return { error };
      }
      
      if (user) {
        logger.info('Login successful, fetching user profile...');
        const fullUser = await getCurrentUser();
        
        if (!fullUser) {
          logger.error('User profile not found after login');
          set({ isLoading: false });
          return { error: 'User profile not found. Please contact support.' };
        }
        
        set({
          user: fullUser,
          isAuthenticated: true,
          isLoading: false,
        });
        logger.info('User authenticated successfully');
        return { error: null };
      }
      
      set({ isLoading: false });
      return { error: 'Login failed' };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      logger.error('Login error', error);
      set({ isLoading: false });
      return { error: errorMessage };
    }
  },

  signup: async (data: SignUpData) => {
    try {
      logger.info('Attempting signup...');
      set({ isLoading: true });
      
      const { user, error } = await signUp(data);
      
      if (error) {
        logger.error('Signup failed', error);
        set({ isLoading: false });
        return { error };
      }
      
      if (user) {
        logger.info('Signup successful, logging in...');
        // Automatically log in after successful signup
        const loginResult = await useAuthStore.getState().login(data.email, data.password);
        return loginResult;
      }
      
      set({ isLoading: false });
      return { error: 'Signup failed' };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Signup failed';
      logger.error('Signup error', error);
      set({ isLoading: false });
      return { error: errorMessage };
    }
  },

  logout: async () => {
    logger.info('Logging out...');
    await signOut();
    set({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    });
  },

  checkAuth: async () => {
    try {
      set({ isLoading: true });
      logger.info('Checking auth state...');
      const user = await getCurrentUser();
      set({
        user,
        isAuthenticated: !!user,
        isLoading: false,
      });
      logger.info('Auth check complete', { authenticated: !!user });
    } catch (error) {
      logger.error('Auth check failed', error);
      
      // If the error is about missing profile, log the user out
      const errorMessage = error instanceof Error ? error.message : '';
      if (errorMessage.includes('User profile not found')) {
        logger.error('User profile missing, logging out user');
        // Log out to clean up the invalid auth state
        await useAuthStore.getState().logout();
      }
      
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  },
}));
