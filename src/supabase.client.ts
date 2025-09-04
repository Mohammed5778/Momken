// In a real application, these should be stored in environment variables
// and not be publicly exposed in the client-side code.
// For this project, we are using placeholder values.
// Please replace them with your actual Supabase project URL and Anon key.
import { createClient } from '@supabase/supabase-js';

// Read variables from the environment. These MUST be set in your Vercel project settings.
// The PUBLIC_ prefix is a convention to indicate these are safe to be exposed to the client-side.
// Vercel and other platforms will inject these variables during the build process.
const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.PUBLIC_SUPABASE_ANON_KEY;


if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    // This warning is crucial for debugging deployment issues.
    console.error('CRITICAL ERROR: Supabase URL and Anon Key are not configured in environment variables. The application will not function. Please set PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_ANON_KEY in your Vercel deployment settings.');
}

// @ts-ignore - The types for process.env might not be defined in this context, but the build process will inject them.
export const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
