import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Try loading local .env or DunMak server .env
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../../DunMak/server/.env') });

const supabaseUrl = process.env.SUPABASE_URL || 'https://aiyglunfwsolqsujyfsz.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpeWdsdW5md3NvbHFzdWp5ZnN6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTk3MzMxMywiZXhwIjoyMDk3NTQ5MzEzfQ.bvCh3e9hAgzJm4xeUNy7EgBIHqgkl0Tj8x1WIiHC6hE';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || supabaseKey;

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
  },
});

export const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
  },
});
