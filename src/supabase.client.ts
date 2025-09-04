// In a real application, these should be stored in environment variables
// and not be publicly exposed in the client-side code.
// For this project, we are using placeholder values.
// Please replace them with your actual Supabase project URL and Anon key.
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://prmpqvmktjkcdqvmsnyl.supabase.co'; // e.g. 'https://xyz.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBybXBxdm1rdGprY2Rxdm1zbnlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY5ODg1NDgsImV4cCI6MjA3MjU2NDU0OH0.CIbEf66QlO5MsHLiduWcNGTvXbnQCRmPquGfaWgsi_U'; // e.g. 'ey...'

if (!SUPABASE_URL || SUPABASE_URL === 'https://prmpqvmktjkcdqvmsnyl.supabase.co' || !SUPABASE_ANON_KEY || SUPABASE_ANON_KEY === 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBybXBxdm1rdGprY2Rxdm1zbnlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY5ODg1NDgsImV4cCI6MjA3MjU2NDU0OH0.CIbEf66QlO5MsHLiduWcNGTvXbnQCRmPquGfaWgsi_U') {
    console.warn('Supabase URL and Anon Key are not configured with your project details. Please update src/supabase.client.ts');
}

export const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);