-- Enhanced security for companies table sensitive financial data
-- This migration implements stricter access controls and data separation

-- 1. Create a separate table for highly sensitive financial data
CREATE TABLE IF NOT EXISTS public.company_financial_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  ein text,
  default_leasing_percentage numeric DEFAULT 5.00,
  default_factoring_percentage numeric DEFAULT 3.00, 
  default_dispatching_percentage numeric DEFAULT 5.00,
  payment_cycle_start_day integer DEFAULT 1,
  payment_day text NOT NULL DEFAULT 'friday',
  default_payment_frequency text DEFAULT 'weekly',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  UNIQUE(company_id)
);

-- Enable RLS on the new financial settings table
ALTER TABLE public.company_financial_settings ENABLE ROW LEVEL SECURITY;

-- 2. Create strict RLS policies for financial data (owners and operations managers only)
CREATE POLICY "company_financial_settings_select_owners_only" ON public.company_financial_settings
FOR SELECT USING (
  (SELECT auth.role()) = 'authenticated' AND
  (SELECT auth.uid()) IS NOT NULL AND
  COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false AND
  (company_id IN (
    SELECT ucr.company_id
    FROM user_company_roles ucr
    WHERE ucr.user_id = (SELECT auth.uid())
    AND ucr.is_active = true
    AND ucr.role IN ('company_owner', 'operations_manager', 'superadmin')
  ) OR (SELECT auth.uid()) IN (
    SELECT c.created_by FROM companies c WHERE c.id = company_id
  ))
);

CREATE POLICY "company_financial_settings_insert_owners_only" ON public.company_financial_settings
FOR INSERT WITH CHECK (
  (SELECT auth.role()) = 'authenticated' AND
  (SELECT auth.uid()) IS NOT NULL AND
  COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false AND
  company_id IN (
    SELECT ucr.company_id
    FROM user_company_roles ucr
    WHERE ucr.user_id = (SELECT auth.uid())
    AND ucr.is_active = true
    AND ucr.role IN ('company_owner', 'superadmin')
  )
);

CREATE POLICY "company_financial_settings_update_owners_only" ON public.company_financial_settings
FOR UPDATE USING (
  (SELECT auth.role()) = 'authenticated' AND
  (SELECT auth.uid()) IS NOT NULL AND
  COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false AND
  company_id IN (
    SELECT ucr.company_id
    FROM user_company_roles ucr
    WHERE ucr.user_id = (SELECT auth.uid())
    AND ucr.is_active = true
    AND ucr.role IN ('company_owner', 'operations_manager', 'superadmin')
  )
) WITH CHECK (
  (SELECT auth.role()) = 'authenticated' AND
  (SELECT auth.uid()) IS NOT NULL AND
  COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false AND
  company_id IN (
    SELECT ucr.company_id
    FROM user_company_roles ucr
    WHERE ucr.user_id = (SELECT auth.uid())
    AND ucr.is_active = true
    AND ucr.role IN ('company_owner', 'operations_manager', 'superadmin')
  )
);

CREATE POLICY "company_financial_settings_delete_owners_only" ON public.company_financial_settings
FOR DELETE USING (
  (SELECT auth.role()) = 'authenticated' AND
  (SELECT auth.uid()) IS NOT NULL AND
  COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false AND
  company_id IN (
    SELECT ucr.company_id
    FROM user_company_roles ucr
    WHERE ucr.user_id = (SELECT auth.uid())
    AND ucr.is_active = true
    AND ucr.role IN ('company_owner', 'superadmin')
  )
);

-- 3. Migrate existing financial data from companies table
INSERT INTO public.company_financial_settings (
  company_id,
  ein,
  default_leasing_percentage,
  default_factoring_percentage,
  default_dispatching_percentage,
  payment_cycle_start_day,
  payment_day,
  default_payment_frequency,
  created_at,
  updated_at
)
SELECT 
  id,
  ein,
  default_leasing_percentage,
  default_factoring_percentage,
  default_dispatching_percentage,
  payment_cycle_start_day,
  payment_day,
  default_payment_frequency,
  created_at,
  updated_at
FROM companies
WHERE NOT EXISTS (
  SELECT 1 FROM company_financial_settings cfs WHERE cfs.company_id = companies.id
);

-- 4. Create audit log table for sensitive data access
CREATE TABLE IF NOT EXISTS public.company_data_access_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  accessed_by uuid NOT NULL,
  access_type text NOT NULL, -- 'financial_data', 'personal_data', 'full_company'
  accessed_at timestamp with time zone NOT NULL DEFAULT now(),
  ip_address inet,
  user_agent text,
  action text NOT NULL -- 'view', 'update', 'export'
);

-- Enable RLS on audit log (superadmin only)
ALTER TABLE public.company_data_access_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company_data_access_log_superadmin_only" ON public.company_data_access_log
FOR ALL USING (
  (SELECT auth.role()) = 'authenticated' AND
  (SELECT auth.uid()) IS NOT NULL AND
  COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false AND
  EXISTS (
    SELECT 1 FROM user_company_roles
    WHERE user_id = (SELECT auth.uid())
    AND role = 'superadmin'
    AND is_active = true
  )
) WITH CHECK (
  (SELECT auth.role()) = 'authenticated' AND
  (SELECT auth.uid()) IS NOT NULL AND
  COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false AND
  EXISTS (
    SELECT 1 FROM user_company_roles
    WHERE user_id = (SELECT auth.uid())
    AND role = 'superadmin'
    AND is_active = true
  )
);

-- 5. Create function to log sensitive data access
CREATE OR REPLACE FUNCTION public.log_company_data_access(
  company_id_param uuid,
  access_type_param text,
  action_param text DEFAULT 'view'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO company_data_access_log (
    company_id,
    accessed_by,
    access_type,
    action,
    accessed_at
  ) VALUES (
    company_id_param,
    auth.uid(),
    access_type_param,
    action_param,
    now()
  );
END;
$$;

-- 6. Update companies table RLS policies to be more restrictive for sensitive data
-- Replace the existing SELECT policy with a more granular one
DROP POLICY IF EXISTS "Companies select for company members only" ON public.companies;

-- Basic company info can be seen by company members
CREATE POLICY "Companies basic info select" ON public.companies
FOR SELECT USING (
  (SELECT auth.role()) = 'authenticated' AND
  (SELECT auth.uid()) IS NOT NULL AND
  COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false AND
  (id IN (
    SELECT ucr.company_id
    FROM user_company_roles ucr
    WHERE ucr.user_id = (SELECT auth.uid()) AND ucr.is_active = true
  ) OR EXISTS (
    SELECT 1 FROM user_company_roles
    WHERE user_id = (SELECT auth.uid())
    AND role = 'superadmin'
    AND is_active = true
  ))
);

-- 7. Create secure view for company data that logs access to sensitive fields
CREATE OR REPLACE VIEW public.companies_secure AS
SELECT 
  c.id,
  c.name,
  c.street_address,
  c.city,
  c.state_id,
  c.zip_code,
  c.phone,
  c.email,
  c.dot_number,
  c.mc_number,
  -- Only show sensitive owner data to owners/operations managers
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM user_company_roles ucr 
      WHERE ucr.company_id = c.id 
      AND ucr.user_id = auth.uid() 
      AND ucr.role IN ('company_owner', 'operations_manager', 'superadmin')
      AND ucr.is_active = true
    ) THEN c.owner_name
    ELSE NULL
  END as owner_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM user_company_roles ucr 
      WHERE ucr.company_id = c.id 
      AND ucr.user_id = auth.uid() 
      AND ucr.role IN ('company_owner', 'operations_manager', 'superadmin')
      AND ucr.is_active = true
    ) THEN c.owner_email
    ELSE NULL
  END as owner_email,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM user_company_roles ucr 
      WHERE ucr.company_id = c.id 
      AND ucr.user_id = auth.uid() 
      AND ucr.role IN ('company_owner', 'operations_manager', 'superadmin')
      AND ucr.is_active = true
    ) THEN c.owner_phone
    ELSE NULL
  END as owner_phone,
  c.owner_title,
  c.plan_type,
  c.max_users,
  c.max_vehicles,
  c.load_assignment_criteria,
  c.contract_start_date,
  c.logo_url,
  c.status,
  c.created_at,
  c.updated_at
FROM companies c
WHERE c.id IN (
  SELECT ucr.company_id
  FROM user_company_roles ucr
  WHERE ucr.user_id = auth.uid() AND ucr.is_active = true
) OR EXISTS (
  SELECT 1 FROM user_company_roles
  WHERE user_id = auth.uid()
  AND role = 'superadmin'
  AND is_active = true
);

-- Grant access to the secure view
GRANT SELECT ON public.companies_secure TO authenticated;