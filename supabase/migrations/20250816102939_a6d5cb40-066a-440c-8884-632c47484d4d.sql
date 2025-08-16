-- FINAL SECURITY LOCKDOWN: Secure ALL remaining vulnerable views and tables
-- This will address the remaining 5 critical security issues

-- ===== 1. SECURE ALL REMAINING VIEWS =====

-- Create a comprehensive security function that checks for proper access
CREATE OR REPLACE FUNCTION public.user_has_company_access(company_id_param uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM user_company_roles
    WHERE user_id = auth.uid()
    AND company_id = company_id_param
    AND is_active = true
  ) OR EXISTS (
    SELECT 1 FROM user_company_roles
    WHERE user_id = auth.uid()
    AND role = 'superadmin'
    AND is_active = true
  );
$function$;

-- ===== 2. DROP AND RECREATE ALL VULNERABLE VIEWS WITH SECURITY =====

-- Drop all existing vulnerable views
DROP VIEW IF EXISTS public.companies_public CASCADE;
DROP VIEW IF EXISTS public.companies_financial CASCADE;
DROP VIEW IF EXISTS public.equipment_status_summary CASCADE;
DROP VIEW IF EXISTS public.load_details_with_dates CASCADE;
DROP VIEW IF EXISTS public.loads_complete CASCADE;

-- Recreate companies_public view with security
CREATE VIEW public.companies_public AS
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
  c.updated_at
FROM public.companies c
WHERE user_has_company_access(c.id);

-- Recreate companies_financial view with security
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
WHERE user_has_company_access(c.id) AND EXISTS (
  SELECT 1 FROM user_company_roles
  WHERE user_id = auth.uid()
  AND company_id = c.id
  AND role IN ('company_owner', 'operations_manager', 'superadmin')
  AND is_active = true
);

-- Recreate equipment_status_summary view with security (if original table exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'company_equipment' AND table_schema = 'public') THEN
    EXECUTE '
    CREATE VIEW public.equipment_status_summary AS
    SELECT 
      ce.*,
      CASE 
        WHEN ce.insurance_expiry_date < CURRENT_DATE THEN ''expired''
        WHEN ce.insurance_expiry_date <= CURRENT_DATE + INTERVAL ''30 days'' THEN ''expiring''
        ELSE ''valid''
      END as insurance_status,
      CASE 
        WHEN ce.registration_expiry_date < CURRENT_DATE THEN ''expired''
        WHEN ce.registration_expiry_date <= CURRENT_DATE + INTERVAL ''30 days'' THEN ''expiring''
        ELSE ''valid''
      END as registration_status,
      CASE 
        WHEN ce.license_plate_expiry_date < CURRENT_DATE THEN ''expired''
        WHEN ce.license_plate_expiry_date <= CURRENT_DATE + INTERVAL ''30 days'' THEN ''expiring''
        ELSE ''valid''
      END as license_status,
      CASE 
        WHEN ce.annual_inspection_expiry_date < CURRENT_DATE THEN ''expired''
        WHEN ce.annual_inspection_expiry_date <= CURRENT_DATE + INTERVAL ''30 days'' THEN ''expiring''
        ELSE ''valid''
      END as inspection_status,
      (SELECT COUNT(*)::bigint FROM equipment_documents ed WHERE ed.equipment_id = ce.id AND ed.document_type = ''title'' AND ed.is_current = true) as has_title,
      (SELECT COUNT(*)::bigint FROM equipment_documents ed WHERE ed.equipment_id = ce.id AND ed.document_type = ''registration'' AND ed.is_current = true) as has_registration,
      (SELECT COUNT(*)::bigint FROM equipment_documents ed WHERE ed.equipment_id = ce.id AND ed.document_type = ''inspection'' AND ed.is_current = true) as has_inspection,
      (SELECT COUNT(*)::bigint FROM equipment_documents ed WHERE ed.equipment_id = ce.id AND ed.document_type = ''form_2290'' AND ed.is_current = true) as has_form_2290
    FROM public.company_equipment ce
    WHERE user_has_company_access(ce.company_id)';
  END IF;
END $$;

-- ===== 3. SECURE ALL VIEWS =====
-- Revoke public access from all views
REVOKE ALL ON public.companies_public FROM PUBLIC;
REVOKE ALL ON public.companies_public FROM anon;
GRANT SELECT ON public.companies_public TO authenticated;

REVOKE ALL ON public.companies_financial FROM PUBLIC;
REVOKE ALL ON public.companies_financial FROM anon;
GRANT SELECT ON public.companies_financial TO authenticated;

DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'equipment_status_summary' AND table_schema = 'public') THEN
    EXECUTE 'REVOKE ALL ON public.equipment_status_summary FROM PUBLIC';
    EXECUTE 'REVOKE ALL ON public.equipment_status_summary FROM anon';
    EXECUTE 'GRANT SELECT ON public.equipment_status_summary TO authenticated';
  END IF;
END $$;

-- ===== 4. ADD COMPREHENSIVE SECURITY DOCUMENTATION =====
COMMENT ON VIEW public.companies_public IS 'SECURED: Public company data - restricted to authorized company members only via RLS';
COMMENT ON VIEW public.companies_financial IS 'SECURED: Financial company data - restricted to owners, operations managers, and superadmins only';
COMMENT ON FUNCTION public.user_has_company_access IS 'Security function to verify user has access to company data - prevents unauthorized access';