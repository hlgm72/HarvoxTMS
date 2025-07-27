-- Final approach: Use system functions to override cron table access
-- Create security definer functions that restrict access

-- Create a function to check if user is authenticated and not anonymous
CREATE OR REPLACE FUNCTION public.is_secure_user()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    auth.role() = 'authenticated' AND
    auth.uid() IS NOT NULL AND 
    COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false;
$$;

-- Create wrapper functions to securely access cron tables
CREATE OR REPLACE FUNCTION public.secure_cron_schedule(
  job_name text,
  schedule text,
  command text
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, cron
AS $$
BEGIN
  -- Only allow authenticated, non-anonymous users
  IF NOT public.is_secure_user() THEN
    RAISE EXCEPTION 'Access denied: Authentication required';
  END IF;
  
  -- Call the actual cron.schedule function
  RETURN cron.schedule(job_name, schedule, command);
END;
$$;

CREATE OR REPLACE FUNCTION public.secure_cron_unschedule(job_name text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, cron
AS $$
BEGIN
  -- Only allow authenticated, non-anonymous users
  IF NOT public.is_secure_user() THEN
    RAISE EXCEPTION 'Access denied: Authentication required';
  END IF;
  
  -- Call the actual cron.unschedule function
  RETURN cron.unschedule(job_name);
END;
$$;

-- Create a secure view for cron jobs that filters anonymous access
CREATE OR REPLACE VIEW public.secure_cron_jobs AS
SELECT * FROM cron.job 
WHERE public.is_secure_user() AND username = current_user;

-- Grant access to authenticated users only
GRANT SELECT ON public.secure_cron_jobs TO authenticated;
GRANT EXECUTE ON FUNCTION public.secure_cron_schedule(text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.secure_cron_unschedule(text) TO authenticated;