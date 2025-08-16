-- Enable RLS on views and create appropriate policies

-- Enable RLS on views
ALTER VIEW public.companies_public ENABLE ROW LEVEL SECURITY;
ALTER VIEW public.companies_financial ENABLE ROW LEVEL SECURITY;
ALTER VIEW public.equipment_status_summary ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for companies_public view
CREATE POLICY companies_public_access ON public.companies_public
FOR SELECT TO public
USING (
  (SELECT auth.role()) = 'authenticated' AND
  (SELECT auth.uid()) IS NOT NULL AND
  COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false AND
  id IN (
    SELECT ucr.company_id
    FROM user_company_roles ucr
    WHERE ucr.user_id = (SELECT auth.uid())
    AND ucr.is_active = true
  )
);

-- Create RLS policy for companies_financial view (restricted to owners and managers)
CREATE POLICY companies_financial_access ON public.companies_financial
FOR SELECT TO public
USING (
  (SELECT auth.role()) = 'authenticated' AND
  (SELECT auth.uid()) IS NOT NULL AND
  COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false AND
  id IN (
    SELECT ucr.company_id
    FROM user_company_roles ucr
    WHERE ucr.user_id = (SELECT auth.uid())
    AND ucr.role IN ('company_owner', 'operations_manager', 'superadmin')
    AND ucr.is_active = true
  )
);

-- Create RLS policy for equipment_status_summary view
CREATE POLICY equipment_status_summary_access ON public.equipment_status_summary
FOR SELECT TO public
USING (
  (SELECT auth.role()) = 'authenticated' AND
  (SELECT auth.uid()) IS NOT NULL AND
  COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false AND
  company_id IN (
    SELECT ucr.company_id
    FROM user_company_roles ucr
    WHERE ucr.user_id = (SELECT auth.uid())
    AND ucr.is_active = true
  )
);