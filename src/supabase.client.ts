import { createClient } from '@supabase/supabase-js';
import { environment } from './environment';

const SUPABASE_URL = environment.supabaseUrl;
const SUPABASE_ANON_KEY = environment.supabaseAnonKey;

// These are placeholder values. Please update them in src/environment.ts
const PLACEHOLDER_URL = 'https://prmpqvmktjkcdqvmsnyl.supabase.co';
const PLACEHOLDER_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBybXBxdm1rdGprY2Rxdm1zbnlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY5ODg1NDgsImV4cCI6MjA3MjU2NDU0OH0.CIbEf66QlO5MsHLiduWcNGTvXbnQCRmPquGfaWgsi_U';

if (!SUPABASE_URL || SUPABASE_URL === PLACEHOLDER_URL || !SUPABASE_ANON_KEY || SUPABASE_ANON_KEY === PLACEHOLDER_KEY) {
    console.warn('Supabase URL and Anon Key are using placeholder values. Please update src/environment.ts with your project details.');
}

export const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
