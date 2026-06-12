import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  'https://bcqusybmadcowpzearfo.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJjcXVzeWJtYWRjb3dwemVhcmZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4MjUyODMsImV4cCI6MjA5NjQwMTI4M30.N5Hxy6vp7FC-l-0BwX4ne0Aa6juaZNT2SEWH5OlUWWc'
);
