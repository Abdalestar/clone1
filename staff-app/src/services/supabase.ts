import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = process.env.SUPABASE_URL || 'https://wlnphingifczfdqxaijb.supabase.co';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndsbnBoaW5naWZjemZkcXhhaWpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwMDIyMjUsImV4cCI6MjA3NzU3ODIyNX0.Per-ycPmUs_5EPLsyb9kDaZ5U9fP9x8JJ89ZmsiPmKQ';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: false,
    detectSessionInUrl: false,
  },
});
