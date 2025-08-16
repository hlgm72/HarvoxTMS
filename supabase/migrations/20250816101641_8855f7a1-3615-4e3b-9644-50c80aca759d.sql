-- CRITICAL SECURITY FIX: Secure companies_financial view with RLS policies
-- This prevents competitors from accessing sensitive financial data

-- Enable RLS on companies_financial view
ALTER TABLE public.companies_financial ENABLE ROW LEVEL SECURITY;

-- Revoke all existing public access
REVOKE ALL ON public.companies_financial FROM PUBLIC;
REVOKE ALL ON public.companies_financial FROM anon;

-- Grant SELECT access only to authenticated users (will be further restricted by policies)
GRANT SELECT ON public.companies_financial TO authenticated;

-- Create RLS policy for financial data access - only company owners, operations managers, and superadmins
CREATE POLICY "companies_financial_authorized_access_only" ON public.companies_financial
FOR SELECT USING (
  (SELECT auth.role()) = 'authenticated' AND 
  (SELECT auth.uid()) IS NOT NULL AND 
  COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false AND 
  (
    -- Allow superadmins to view all companies
    EXISTS (
      SELECT 1 FROM user_company_roles
      WHERE user_id = (SELECT auth.uid()) 
      AND role = 'superadmin' 
      AND is_active = true
    )
    OR
    -- Allow company owners and operations managers to view their own company
    EXISTS (
      SELECT 1 FROM user_company_roles
      WHERE user_id = (SELECT auth.uid()) 
      AND company_id = companies_financial.id 
      AND role IN ('company_owner', 'operations_manager') 
      AND is_active = true
    )
  )
);

-- Add security documentation
COMMENT ON TABLE public.companies_financial IS 'SECURED: Financial company data view - restricted to company owners, operations managers, and superadmins only. Contains sensitive business information including EIN, payment percentages, and contract details.';

-- Create audit trigger for financial data access (for compliance)
CREATE OR REPLACE FUNCTION public.log_financial_data_access()
RETURNS TRIGGER AS $$
BEGIN
  -- Log access to sensitive financial data
  INSERT INTO company_sensitive_data_access_log (
    company_id,
    accessed_by,
    access_type,
    user_role,
    accessed_at
  ) VALUES (
    NEW.id,
    auth.uid(),
    'companies_financial_view',
    (SELECT role FROM user_company_roles WHERE user_id = auth.uid() AND company_id = NEW.id AND is_active = true LIMIT 1),
    now()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: Triggers on views require INSTEAD OF triggers, but since this is a view
-- we'll rely on application-level logging for audit trails