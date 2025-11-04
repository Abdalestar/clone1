import Constants from 'expo-constants';

interface EnvConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  appEnv: string;
  apiBaseUrl: string;
  enableAnalytics: boolean;
  enablePushNotifications: boolean;
  enableOfflineMode: boolean;
}

// Get environment variables from Expo Constants
const getEnvVar = (key: string, fallback: string = ''): string => {
  return Constants.expoConfig?.extra?.[key] || process.env[key] || fallback;
};

const getBoolEnvVar = (key: string, fallback: boolean = false): boolean => {
  const value = getEnvVar(key, fallback.toString());
  return value === 'true' || value === '1';
};

// Validate required environment variables
const validateEnv = (): void => {
  const required = ['SUPABASE_URL', 'SUPABASE_ANON_KEY'];
  const missing = required.filter(key => !getEnvVar(key));

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      'Please check your .env file and app.json configuration.'
    );
  }
};

// Validate on load
validateEnv();

export const ENV: EnvConfig = {
  supabaseUrl: getEnvVar('SUPABASE_URL'),
  supabaseAnonKey: getEnvVar('SUPABASE_ANON_KEY'),
  appEnv: getEnvVar('APP_ENV', 'development'),
  apiBaseUrl: getEnvVar('API_BASE_URL'),
  enableAnalytics: getBoolEnvVar('ENABLE_ANALYTICS', true),
  enablePushNotifications: getBoolEnvVar('ENABLE_PUSH_NOTIFICATIONS', true),
  enableOfflineMode: getBoolEnvVar('ENABLE_OFFLINE_MODE', true),
};

export const isDevelopment = ENV.appEnv === 'development';
export const isProduction = ENV.appEnv === 'production';

// Log config in development (without sensitive data)
if (isDevelopment) {
  console.log('🔧 Environment Configuration:', {
    appEnv: ENV.appEnv,
    supabaseUrl: ENV.supabaseUrl,
    features: {
      analytics: ENV.enableAnalytics,
      pushNotifications: ENV.enablePushNotifications,
      offlineMode: ENV.enableOfflineMode,
    },
  });
}
