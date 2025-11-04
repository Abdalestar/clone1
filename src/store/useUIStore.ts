import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface UIState {
  theme: 'light' | 'dark';
  notificationsEnabled: boolean;
  language: 'en' | 'ar';
  hasCompletedOnboarding: boolean;

  // Actions
  setTheme: (theme: 'light' | 'dark') => void;
  toggleTheme: () => void;
  setNotificationsEnabled: (enabled: boolean) => void;
  setLanguage: (language: 'en' | 'ar') => void;
  completeOnboarding: () => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      theme: 'light',
      notificationsEnabled: true,
      language: 'en',
      hasCompletedOnboarding: false,

      setTheme: (theme) => set({ theme }),

      toggleTheme: () =>
        set((state) => ({
          theme: state.theme === 'light' ? 'dark' : 'light',
        })),

      setNotificationsEnabled: (enabled) =>
        set({ notificationsEnabled: enabled }),

      setLanguage: (language) => set({ language }),

      completeOnboarding: () => set({ hasCompletedOnboarding: true }),
    }),
    {
      name: 'ui-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
