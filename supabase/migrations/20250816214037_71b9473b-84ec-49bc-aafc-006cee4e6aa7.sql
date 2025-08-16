-- Fix function search path security warning
-- Set explicit search_path for the function to prevent search path attacks

-- Drop and recreate the function with proper search_path
DROP FUNCTION IF EXISTS public.update_company_owner_details_updated_at() CASCADE;

-- Recreate the function with secure search_path
CREATE OR REPLACE FUNCTION public.update_company_owner_details_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path TO 'public';

-- Recreate the trigger if it exists
DROP TRIGGER IF EXISTS update_company_owner_details_updated_at ON public.company_owner_details;

CREATE TRIGGER update_company_owner_details_updated_at
  BEFORE UPDATE ON public.company_owner_details
  FOR EACH ROW
  EXECUTE FUNCTION public.update_company_owner_details_updated_at();

-- Verify the function has proper search_path set
SELECT 
  routine_name,
  routine_type,
  security_type,
  proconfig as function_settings
FROM information_schema.routines r
LEFT JOIN pg_proc p ON p.proname = r.routine_name
WHERE routine_name = 'update_company_owner_details_updated_at'
AND routine_schema = 'public';