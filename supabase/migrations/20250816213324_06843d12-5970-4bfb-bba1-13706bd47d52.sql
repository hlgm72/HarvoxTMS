-- ========================================
-- SECURITY FIX: Remove owner personal data from companies table (Part 2)
-- ========================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "owner_details_select_restricted" ON public.company_owner_details;
DROP POLICY IF EXISTS "owner_details_insert_restricted" ON public.company_owner_details;
DROP POLICY IF EXISTS "owner_details_update_restricted" ON public.company_owner_details;
DROP POLICY IF EXISTS "owner_details_delete_restricted" ON public.company_owner_details;

-- Create strict RLS policies for owner data access
CREATE POLICY "owner_details_owners_only" ON public.company_owner_details
FOR ALL
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

-- Remove owner personal data columns from the main companies table
-- This is the key security fix - removing sensitive data exposure
ALTER TABLE public.companies DROP COLUMN IF EXISTS owner_name CASCADE;
ALTER TABLE public.companies DROP COLUMN IF EXISTS owner_email CASCADE;
ALTER TABLE public.companies DROP COLUMN IF EXISTS owner_phone CASCADE;
ALTER TABLE public.companies DROP COLUMN IF EXISTS owner_title CASCADE;

-- Update the companies_secure view to reflect the new structure
DROP VIEW IF EXISTS public.companies_secure;
CREATE VIEW public.companies_secure AS
SELECT 
  c.*
FROM companies c
WHERE 
  (SELECT auth.uid()) IS NOT NULL 
  AND COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false
  AND (
    -- Users can see their company's data (owner personal info now separated)
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

-- Create a comprehensive view for owners that includes owner details
CREATE OR REPLACE VIEW public.companies_with_owner_info AS
SELECT 
  c.*,
  cod.owner_name,
  cod.owner_email,
  cod.owner_phone,
  cod.owner_title
FROM companies c
LEFT JOIN company_owner_details cod ON c.id = cod.company_id
WHERE 
  (SELECT auth.uid()) IS NOT NULL 
  AND COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false
  AND (
    -- Only company owners and superadmins can see this view with owner info
    EXISTS (
      SELECT 1 FROM user_company_roles
      WHERE user_id = (SELECT auth.uid())
      AND company_id = c.id
      AND role = 'company_owner'
      AND is_active = true
    )
    OR EXISTS (
      SELECT 1 FROM user_company_roles
      WHERE user_id = (SELECT auth.uid())
      AND role = 'superadmin'
      AND is_active = true
    )
  );

-- Set permissions
GRANT SELECT ON public.companies_secure TO authenticated;
GRANT SELECT ON public.companies_with_owner_info TO authenticated;
REVOKE ALL ON public.companies_secure FROM anon, public;
REVOKE ALL ON public.companies_with_owner_info FROM anon, public;

-- Add security comments
COMMENT ON VIEW public.companies_secure IS 
'Secure company data view without owner personal information. Safe for all company users.';

COMMENT ON VIEW public.companies_with_owner_info IS 
'Complete company data including owner personal details. Restricted to company owners and superadmins only.';

COMMENT ON POLICY "owner_details_owners_only" ON public.company_owner_details IS 
'Ultra-secure policy: Only company owners and superadmins can access owner personal data.';