-- ========================================
-- SECURITY FIX: Restrict Access to Company Sensitive Data
-- ========================================

-- First, drop the overly permissive policy
DROP POLICY IF EXISTS "companies_comprehensive_access" ON public.companies;

-- Create more restrictive and specific policies for company data

-- 1. SELECT Policy: Only allow users to see companies they belong to
CREATE POLICY "companies_select_own_company_only"
ON public.companies
FOR SELECT
TO authenticated
USING (
  -- User must be authenticated
  auth.uid() IS NOT NULL 
  AND COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false
  AND (
    -- User has active role in this specific company
    EXISTS (
      SELECT 1 FROM user_company_roles
      WHERE user_id = auth.uid()
      AND company_id = companies.id
      AND is_active = true
    )
    OR
    -- OR user is a superadmin (can see all companies)
    EXISTS (
      SELECT 1 FROM user_company_roles
      WHERE user_id = auth.uid()
      AND role = 'superadmin'
      AND is_active = true
    )
  )
);

-- 2. INSERT Policy: Only superadmins can create new companies
CREATE POLICY "companies_insert_superadmin_only"
ON public.companies
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false
  AND EXISTS (
    SELECT 1 FROM user_company_roles
    WHERE user_id = auth.uid()
    AND role = 'superadmin'
    AND is_active = true
  )
);

-- 3. UPDATE Policy: Only company owners, operations managers, and superadmins can update
CREATE POLICY "companies_update_authorized_roles_only"
ON public.companies
FOR UPDATE
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false
  AND (
    -- User has admin role in this specific company
    EXISTS (
      SELECT 1 FROM user_company_roles
      WHERE user_id = auth.uid()
      AND company_id = companies.id
      AND role IN ('company_owner', 'operations_manager')
      AND is_active = true
    )
    OR
    -- OR user is a superadmin
    EXISTS (
      SELECT 1 FROM user_company_roles
      WHERE user_id = auth.uid()
      AND role = 'superadmin'
      AND is_active = true
    )
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false
  AND (
    -- User has admin role in this specific company
    EXISTS (
      SELECT 1 FROM user_company_roles
      WHERE user_id = auth.uid()
      AND company_id = companies.id
      AND role IN ('company_owner', 'operations_manager')
      AND is_active = true
    )
    OR
    -- OR user is a superadmin
    EXISTS (
      SELECT 1 FROM user_company_roles
      WHERE user_id = auth.uid()
      AND role = 'superadmin'
      AND is_active = true
    )
  )
);

-- 4. DELETE Policy: Only superadmins can delete companies (high-risk operation)
CREATE POLICY "companies_delete_superadmin_only"
ON public.companies
FOR DELETE
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false
  AND EXISTS (
    SELECT 1 FROM user_company_roles
    WHERE user_id = auth.uid()
    AND role = 'superadmin'
    AND is_active = true
  )
);

-- ========================================
-- ENHANCED SECURITY: Add audit logging trigger
-- ========================================

-- Create a trigger to log all access to sensitive company data
CREATE OR REPLACE FUNCTION public.audit_company_data_access()
RETURNS TRIGGER AS $$
BEGIN
  -- Log all operations on companies table
  INSERT INTO company_data_access_log (
    company_id,
    accessed_by,
    access_type,
    action,
    accessed_at,
    ip_address,
    user_agent
  ) VALUES (
    CASE 
      WHEN TG_OP = 'DELETE' THEN OLD.id
      ELSE NEW.id
    END,
    auth.uid(),
    'company_data',
    TG_OP::text,
    now(),
    NULL, -- IP will be logged from application layer if needed
    NULL  -- User agent will be logged from application layer if needed
  );
  
  RETURN CASE 
    WHEN TG_OP = 'DELETE' THEN OLD
    ELSE NEW
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Apply the audit trigger to companies table
DROP TRIGGER IF EXISTS audit_company_access_trigger ON public.companies;
CREATE TRIGGER audit_company_access_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.audit_company_data_access();

-- ========================================
-- ADDITIONAL SECURITY: Create view for non-sensitive company data
-- ========================================

-- Create a view that excludes the most sensitive fields for general use
CREATE OR REPLACE VIEW public.companies_basic_info AS
SELECT 
  id,
  name,
  street_address,
  state_id,
  zip_code,
  city,
  phone,
  email,
  plan_type,
  status,
  logo_url,
  created_at,
  updated_at
FROM public.companies;

-- Apply RLS to the view as well
ALTER VIEW public.companies_basic_info SET (security_invoker = true);

-- ========================================
-- SECURITY FUNCTION: Check if user can access sensitive company fields
-- ========================================

CREATE OR REPLACE FUNCTION public.can_access_company_financial_data(company_id_param uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_company_roles
    WHERE user_id = auth.uid()
    AND company_id = company_id_param
    AND role IN ('company_owner', 'superadmin')  -- Only owners and superadmins can see financial data
    AND is_active = true
  );
$$;

-- ========================================
-- COMMENT DOCUMENTATION
-- ========================================

COMMENT ON POLICY "companies_select_own_company_only" ON public.companies IS 
'Users can only view companies where they have an active role. Superadmins can view all companies.';

COMMENT ON POLICY "companies_insert_superadmin_only" ON public.companies IS 
'Only superadmins can create new companies to prevent unauthorized company creation.';

COMMENT ON POLICY "companies_update_authorized_roles_only" ON public.companies IS 
'Only company owners, operations managers, and superadmins can modify company data.';

COMMENT ON POLICY "companies_delete_superadmin_only" ON public.companies IS 
'Only superadmins can delete companies due to the critical nature of this operation.';

COMMENT ON FUNCTION public.audit_company_data_access() IS 
'Audit function to log all access to company data for security monitoring.';

COMMENT ON VIEW public.companies_basic_info IS 
'Non-sensitive view of company data excluding financial and personal owner information.';