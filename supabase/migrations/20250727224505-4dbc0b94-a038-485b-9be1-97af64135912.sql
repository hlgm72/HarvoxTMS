-- Fix the security definer view issue
-- Remove all the problematic security definer implementations

-- Drop the problematic view that created the security error
DROP VIEW IF EXISTS public.secure_cron_jobs;

-- Drop the wrapper functions that aren't needed
DROP FUNCTION IF EXISTS public.secure_cron_schedule(text, text, text);
DROP FUNCTION IF EXISTS public.secure_cron_unschedule(text);
DROP FUNCTION IF EXISTS public.is_secure_user();

-- Simple approach: Just revoke public access from cron schema entirely
-- This should be allowed since we're revoking, not granting
REVOKE ALL ON SCHEMA cron FROM public;
REVOKE ALL ON ALL TABLES IN SCHEMA cron FROM public;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA cron FROM public;

-- Grant access only to specific authenticated roles that need it
GRANT USAGE ON SCHEMA cron TO postgres, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA cron TO postgres, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA cron TO postgres, service_role;