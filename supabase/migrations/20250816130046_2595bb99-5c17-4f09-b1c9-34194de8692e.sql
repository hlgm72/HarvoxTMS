-- Fix security functions to allow postgres superuser access

CREATE OR REPLACE FUNCTION public.can_access_company_basic_data(company_id_param uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    -- Allow postgres superuser full access
    CASE 
      WHEN current_user = 'postgres' THEN true
      WHEN auth.uid() IS NULL THEN false
      ELSE EXISTS (
        SELECT 1 FROM user_company_roles 
        WHERE user_id = auth.uid() 
        AND company_id = company_id_param 
        AND is_active = true
      )
    END;
$$;

CREATE OR REPLACE FUNCTION public.can_access_company_financial_data(company_id_param uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    -- Allow postgres superuser full access
    CASE 
      WHEN current_user = 'postgres' THEN true
      WHEN auth.uid() IS NULL THEN false
      ELSE EXISTS (
        SELECT 1 FROM user_company_roles 
        WHERE user_id = auth.uid() 
        AND company_id = company_id_param 
        AND role IN ('company_owner', 'operations_manager', 'superadmin') 
        AND is_active = true
      )
    END;
$$;