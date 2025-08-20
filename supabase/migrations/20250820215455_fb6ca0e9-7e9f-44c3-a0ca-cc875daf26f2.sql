-- Drop the duplicate get_companies_basic_info function without parameters
-- Keep the one with optional target_company_id parameter as it's more flexible

DROP FUNCTION IF EXISTS public.get_companies_basic_info() CASCADE;