interface EnvConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  appEnv: string;
  apiBaseUrl: string;
  enableAnalytics: boolean;
  enablePushNotifications: boolean;
  enableOfflineMode: boolean;
}

// Hardcoded environment variables (replace with your actual values)
export const ENV: EnvConfig = {
  supabaseUrl: 'https://wlnphingifczfdqxaijb.supabase.co',
  supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndsbnBoaW5naWZjemZkcXhhaWpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwMDIyMjUsImV4cCI6MjA3NzU3ODIyNX0.Per-ycPmUs_5EPLsyb9kDaZ5U9fP9x8JJ89ZmsiPmKQ',
  appEnv: 'development',
  apiBaseUrl: '',
  enableAnalytics: true,
  enablePushNotifications: true,
  enableOfflineMode: true,
};

export const isDevelopment = ENV.appEnv === 'development';
export const isProduction = ENV.appEnv === 'production';
