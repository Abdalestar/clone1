import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet, useColorScheme } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

// Services
import { supabase } from './src/services/supabase';
import notificationService from './src/services/notifications';
import offlineSyncService from './src/services/offlineSync';
import logger from './src/utils/logger';

// Navigation
import AppNavigator from './src/navigation/AppNavigator';
import AuthNavigator from './src/navigation/AuthNavigator';

// Stores
import { useAuthStore } from './src/store/useAuthStore';
import { useUIStore } from './src/store/useUIStore';
import { useStampStore } from './src/store/useStampStore';

// Components
import ErrorBoundary from './src/components/ErrorBoundary';
import OnboardingScreen from './src/screens/OnboardingScreen';

// Utils
import { COLORS } from './src/utils/constants';
import { getTheme } from './src/utils/theme';

// i18n
import './src/i18n/config';

// Create React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 3,
    },
  },
});

export default function App() {
  const [loading, setLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Zustand stores
  const { checkAuth, user, isAuthenticated } = useAuthStore();
  const { hasCompletedOnboarding, theme } = useUIStore();
  const { fetchBusinesses } = useStampStore();

  // System theme
  const systemColorScheme = useColorScheme();
  const currentTheme = getTheme(theme === 'light' ? 'light' : 'dark');

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      logger.info('Initializing app...');

      // Check auth state
      await checkAuth();

      // Initialize auth listener
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
        if (session?.user) {
          await checkAuth();

          // Register for push notifications
          if (user) {
            const pushToken = await notificationService.registerForPushNotifications();
            if (pushToken) {
              await notificationService.savePushToken(user.id, pushToken);
            }
          }
        } else {
          useAuthStore.getState().setUser(null);
        }
      });

      // Setup notification listeners
      const removeNotificationListeners = notificationService.setupNotificationListeners(
        (notification) => {
          logger.info('Notification received in foreground', notification);
        },
        (response) => {
          logger.info('User interacted with notification', response);
          // Handle navigation based on notification data
        }
      );

      // Fetch businesses for offline access
      await fetchBusinesses();

      // Check if user needs onboarding
      if (isAuthenticated && !hasCompletedOnboarding) {
        setShowOnboarding(true);
      }

      setLoading(false);

      // Cleanup
      return () => {
        subscription.unsubscribe();
        removeNotificationListeners();
      };
    } catch (error) {
      logger.error('Failed to initialize app', error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: currentTheme.colors.background }]}>
        <ActivityIndicator size="large" color={currentTheme.colors.primary} />
      </View>
    );
  }

  if (showOnboarding) {
    return (
      <OnboardingScreen
        onComplete={() => {
          setShowOnboarding(false);
        }}
      />
    );
  }

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <QueryClientProvider client={queryClient}>
          <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
          <NavigationContainer theme={{
            dark: theme === 'dark',
            colors: {
              primary: currentTheme.colors.primary,
              background: currentTheme.colors.background,
              card: currentTheme.colors.card,
              text: currentTheme.colors.text,
              border: currentTheme.colors.border,
              notification: currentTheme.colors.error,
            },
          }}>
            {isAuthenticated ? <AppNavigator /> : <AuthNavigator />}
          </NavigationContainer>
        </QueryClientProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
});
