import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

const supabaseUrl = 'https://phgjifyxpaomtjmvuifm.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBoZ2ppZnl4cGFvbXRqbXZ1aWZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMzNTc1MjgsImV4cCI6MjA3ODkzMzUyOH0.FZzksiZEFNOljX3oP3WaBchS2_XnvKII1f6hb6MdY8k'
export const supabase = createClient(supabaseUrl, supabaseKey)