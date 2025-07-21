-- Create a security definer function to check load access
CREATE OR REPLACE FUNCTION public.can_access_load(load_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  load_record RECORD;
  user_companies uuid[];
BEGIN
  -- Get the load details
  SELECT driver_user_id, created_by INTO load_record
  FROM public.loads
  WHERE id = load_id_param;
  
  -- If load not found, deny access
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- Get user's companies
  SELECT ARRAY_AGG(company_id) INTO user_companies
  FROM public.user_company_roles
  WHERE user_id = auth.uid() AND is_active = true;
  
  -- Allow access if:
  -- 1. User is the driver
  -- 2. User created the load
  -- 3. User is in the same company as the driver or creator
  RETURN (
    load_record.driver_user_id = auth.uid() OR
    load_record.created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.user_company_roles ucr
      WHERE ucr.user_id IN (load_record.driver_user_id, load_record.created_by)
        AND ucr.company_id = ANY(user_companies)
        AND ucr.is_active = true
    )
  );
END;
$$;

-- Drop the existing policy
DROP POLICY IF EXISTS "Load stops access policy" ON public.load_stops;

-- Create a simple new policy using the function
CREATE POLICY "Load stops access policy" ON public.load_stops
FOR ALL
USING (
  ((select auth.role()) = 'service_role') OR 
  (((select auth.role()) = 'authenticated') AND public.can_access_load(load_id))
)
WITH CHECK (
  ((select auth.role()) = 'service_role') OR 
  (((select auth.role()) = 'authenticated') AND public.can_access_load(load_id))
);