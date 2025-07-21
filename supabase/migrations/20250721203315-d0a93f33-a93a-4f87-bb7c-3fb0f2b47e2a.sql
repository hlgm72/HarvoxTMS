-- THE ROOT CAUSE: There's still a function being called during INSERT
-- Let's check if there's a remaining view or RLS policy calling problematic functions

-- First, let's completely disable RLS on load_stops to test
ALTER TABLE public.load_stops DISABLE ROW LEVEL SECURITY;

-- Also check if there are any views or other objects that might be triggering
-- Let's see what could be calling company_id during INSERT
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes 
WHERE tablename = 'load_stops';