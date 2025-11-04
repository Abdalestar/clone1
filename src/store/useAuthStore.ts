import { create } from 'zustand';
import { User } from '../types';
import { getCurrentUser, signIn, signOut } from '../services/auth';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  // Actions
  setUser: (user: User | null) => void;
  login: (email: string, password: string) => Promise<{ error: string | null }>;
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
    const { user, error } = await signIn(email, password);
    if (user) {
      const fullUser = await getCurrentUser();
      set({
        user: fullUser,
        isAuthenticated: true,
        isLoading: false,
      });
    }
    return { error };
  },

  logout: async () => {
    await signOut();
    set({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    });
  },

  checkAuth: async () => {
    set({ isLoading: true });
    const user = await getCurrentUser();
    set({
      user,
      isAuthenticated: !!user,
      isLoading: false,
    });
  },
}));
