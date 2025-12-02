// supabase-config.js
// Replace these values with your actual Supabase project credentials
const SUPABASE_URL = 'https://sbexusqjvmfbumnedfey.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNiZXh1c3Fqdm1mYnVtbmVkZmV5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzUwNjU1NTgsImV4cCI6MjA1MDY0MTU1OH0.8oRc6mX4pO8wA4Q4v4Q4v4Q4v4Q4v4Q4v4Q4v4Q4v4Q4'; // Replace with your anon key

// Initialize Supabase client
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
    }
});