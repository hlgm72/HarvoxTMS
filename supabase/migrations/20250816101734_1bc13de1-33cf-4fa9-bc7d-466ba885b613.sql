-- CRITICAL SECURITY FIX: Secure companies_financial view (Alternative Approach)
-- Since RLS cannot be enabled on views, we'll secure access through permissions and functions

-- Step 1: Revoke all public access from companies_financial view
REVOKE ALL ON public.companies_financial FROM PUBLIC;
REVOKE ALL ON public.companies_financial FROM anon;

-- Step 2: Grant SELECT only to authenticated users (will be restricted by underlying table's RLS)
GRANT SELECT ON public.companies_financial TO authenticated;

-- Step 3: Create a security function to check financial data access
CREATE OR REPLACE FUNCTION public.can_access_financial_data(company_id_param uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM user_company_roles
    WHERE user_id = auth.uid()
    AND company_id = company_id_param
    AND role IN ('company_owner', 'operations_manager', 'superadmin')
    AND is_active = true
  ) OR EXISTS (
    SELECT 1 FROM user_company_roles
    WHERE user_id = auth.uid()
    AND role = 'superadmin'
    AND is_active = true
  );
$function$;

-- Step 4: Recreate companies_financial view with security filter
DROP VIEW IF EXISTS public.companies_financial;

CREATE VIEW public.companies_financial AS
SELECT 
  c.id,
  c.name,
  c.street_address,
  c.state_id,
  c.zip_code,
  c.city,
  c.phone,
  c.email,
  c.logo_url,
  c.status,
  c.plan_type,
  c.created_at,
  c.updated_at,
  c.owner_name,
  c.owner_email,
  c.owner_phone,
  c.owner_title,
  c.dot_number,
  c.mc_number,
  c.ein,
  c.max_users,
  c.max_vehicles,
  c.default_payment_frequency,
  c.payment_cycle_start_day,
  c.payment_day,
  c.default_leasing_percentage,
  c.default_factoring_percentage,
  c.default_dispatching_percentage,
  c.load_assignment_criteria,
  c.contract_start_date
FROM public.companies c
WHERE can_access_financial_data(c.id);

-- Step 5: Add security documentation
COMMENT ON VIEW public.companies_financial IS 'SECURED: Financial company data view - access restricted through underlying table RLS and security function. Contains sensitive business information including EIN, payment percentages, and contract details. Only accessible to company owners, operations managers, and superadmins.';

-- Step 6: Grant permissions on the recreated view
GRANT SELECT ON public.companies_financial TO authenticated;