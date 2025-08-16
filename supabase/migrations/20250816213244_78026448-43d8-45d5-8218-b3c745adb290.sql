-- ========================================
-- COMPREHENSIVE SECURITY FIX: Separate owner personal data from companies table
-- ========================================

-- Step 1: Create a separate table for owner personal data
CREATE TABLE IF NOT EXISTS public.company_owner_details (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  owner_name text,
  owner_email text,
  owner_phone text,
  owner_title text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(company_id) -- One owner record per company
);

-- Enable RLS on the new table
ALTER TABLE public.company_owner_details ENABLE ROW LEVEL SECURITY;

-- Step 2: Create strict RLS policies for owner data
CREATE POLICY "owner_details_select_restricted" ON public.company_owner_details
FOR SELECT
USING (
  (SELECT auth.uid()) IS NOT NULL 
  AND COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false 
  AND (
    -- Only company owners and superadmins can access owner personal data
    EXISTS (
      SELECT 1 FROM user_company_roles
      WHERE user_id = (SELECT auth.uid())
      AND company_id = company_owner_details.company_id
      AND role = 'company_owner'
      AND is_active = true
    )
    OR EXISTS (
      SELECT 1 FROM user_company_roles
      WHERE user_id = (SELECT auth.uid())
      AND role = 'superadmin'
      AND is_active = true
    )
  )
);

CREATE POLICY "owner_details_insert_restricted" ON public.company_owner_details
FOR INSERT
WITH CHECK (
  (SELECT auth.uid()) IS NOT NULL 
  AND COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false 
  AND (
    EXISTS (
      SELECT 1 FROM user_company_roles
      WHERE user_id = (SELECT auth.uid())
      AND company_id = company_owner_details.company_id
      AND role IN ('company_owner', 'superadmin')
      AND is_active = true
    )
    OR EXISTS (
      SELECT 1 FROM user_company_roles
      WHERE user_id = (SELECT auth.uid())
      AND role = 'superadmin'
      AND is_active = true
    )
  )
);

CREATE POLICY "owner_details_update_restricted" ON public.company_owner_details
FOR UPDATE
USING (
  (SELECT auth.uid()) IS NOT NULL 
  AND COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false 
  AND (
    EXISTS (
      SELECT 1 FROM user_company_roles
      WHERE user_id = (SELECT auth.uid())
      AND company_id = company_owner_details.company_id
      AND role IN ('company_owner', 'superadmin')
      AND is_active = true
    )
    OR EXISTS (
      SELECT 1 FROM user_company_roles
      WHERE user_id = (SELECT auth.uid())
      AND role = 'superadmin'
      AND is_active = true
    )
  )
)
WITH CHECK (
  (SELECT auth.uid()) IS NOT NULL 
  AND COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false 
  AND (
    EXISTS (
      SELECT 1 FROM user_company_roles
      WHERE user_id = (SELECT auth.uid())
      AND company_id = company_owner_details.company_id
      AND role IN ('company_owner', 'superadmin')
      AND is_active = true
    )
    OR EXISTS (
      SELECT 1 FROM user_company_roles
      WHERE user_id = (SELECT auth.uid())
      AND role = 'superadmin'
      AND is_active = true
    )
  )
);

CREATE POLICY "owner_details_delete_restricted" ON public.company_owner_details
FOR DELETE
USING (
  (SELECT auth.uid()) IS NOT NULL 
  AND COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false 
  AND EXISTS (
    SELECT 1 FROM user_company_roles
    WHERE user_id = (SELECT auth.uid())
    AND role = 'superadmin'
    AND is_active = true
  )
);

-- Step 3: Migrate existing owner data
INSERT INTO public.company_owner_details (company_id, owner_name, owner_email, owner_phone, owner_title)
SELECT 
  id,
  owner_name,
  owner_email, 
  owner_phone,
  owner_title
FROM public.companies
WHERE owner_name IS NOT NULL OR owner_email IS NOT NULL OR owner_phone IS NOT NULL
ON CONFLICT (company_id) DO UPDATE SET
  owner_name = EXCLUDED.owner_name,
  owner_email = EXCLUDED.owner_email,
  owner_phone = EXCLUDED.owner_phone,
  owner_title = EXCLUDED.owner_title,
  updated_at = now();

-- Step 4: Create secure view that excludes sensitive owner data
CREATE OR REPLACE VIEW public.companies_secure AS
SELECT 
  c.id,
  c.name,
  c.street_address,
  c.state_id,
  c.zip_code,
  c.city,
  c.phone,
  c.email,
  c.plan_type,
  c.status,
  c.logo_url,
  c.created_at,
  c.updated_at,
  -- Include financial data but exclude owner personal data
  c.ein,
  c.dot_number,
  c.mc_number,
  c.max_vehicles,
  c.max_users,
  c.contract_start_date,
  c.default_payment_frequency,
  c.payment_cycle_start_day,
  c.payment_day,
  c.default_factoring_percentage,
  c.default_dispatching_percentage,
  c.default_leasing_percentage,
  c.load_assignment_criteria
FROM companies c
WHERE 
  (SELECT auth.uid()) IS NOT NULL 
  AND COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false
  AND (
    -- Users can see their company's data (minus owner personal info)
    c.id IN (
      SELECT ucr.company_id
      FROM user_company_roles ucr
      WHERE ucr.user_id = (SELECT auth.uid())
      AND ucr.is_active = true
    )
    OR EXISTS (
      SELECT 1 FROM user_company_roles
      WHERE user_id = (SELECT auth.uid())
      AND role = 'superadmin'
      AND is_active = true
    )
  );

-- Set proper permissions
GRANT SELECT ON public.company_owner_details TO authenticated;
GRANT INSERT, UPDATE ON public.company_owner_details TO authenticated;
GRANT SELECT ON public.companies_secure TO authenticated;
REVOKE ALL ON public.company_owner_details FROM anon, public;
REVOKE ALL ON public.companies_secure FROM anon, public;

-- Add documentation
COMMENT ON TABLE public.company_owner_details IS 
'Stores sensitive owner personal information (names, emails, phones) with strict access control. Only company owners and superadmins can access this data.';

COMMENT ON VIEW public.companies_secure IS 
'Secure view of company data excluding sensitive owner personal information. Provides business data while protecting owner privacy.';

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_company_owner_details_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_company_owner_details_updated_at
  BEFORE UPDATE ON public.company_owner_details
  FOR EACH ROW
  EXECUTE FUNCTION public.update_company_owner_details_updated_at();