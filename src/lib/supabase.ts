import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://gahfzpbqdxakfvxxvurq.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdhaGZ6cGJxZHhha2Z2eHh2dXJxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA2MjcwOTUsImV4cCI6MjEwNjIwMzA5NX0.U5xCcRnBZ6YaMqHV_i6iLiOJvpGaFUP4xmWSwKK16H4';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
