import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://aiyglunfwsolqsujyfsz.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpeWdsdW5md3NvbHFzdWp5ZnN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE5NzMzMTMsImV4cCI6MjA5NzU0OTMxM30.sxZUp498yTI8UxFomkd21e0glRT9lCYi07RmdWF1XhY';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: window.localStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  }
});
