import { createClient } from '@supabase/supabase-js';
import { config } from './config';

// Single shared Supabase client for the whole app.
// URL + key come from .env.local (see services/config.ts).
export const supabase = createClient(config.supabaseUrl, config.supabaseAnonKey);
