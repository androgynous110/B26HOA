import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL = 'https://bfcdycndnjbgaciblgbm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJmY2R5Y25kbmpiZ2FjaWJsZ2JtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkzNzc3OTMsImV4cCI6MjA2NDk1Mzc5M30.Sn2IigLL3ceIhBeC4sbELOB-HSvIPmi64DdMJzEZl14';

export const supabase =
  window.supabaseInstance ||
  (window.supabaseInstance = createClient(SUPABASE_URL, SUPABASE_ANON_KEY));
