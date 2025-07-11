-- Fix remaining multiple permissive RLS policies
-- Consolidate policies on company_broker_dispatchers, company_brokers, company_documents, and company_drivers

-- 1. Fix company_broker_dispatchers table
DROP POLICY IF EXISTS "Company members can delete broker dispatchers" ON public.company_broker_dispatchers;
DROP POLICY IF EXISTS "Company members can insert broker dispatchers" ON public.company_broker_dispatchers;
DROP POLICY IF EXISTS "Company members can update broker dispatchers" ON public.company_broker_dispatchers;
DROP POLICY IF EXISTS "Company members can view broker dispatchers" ON public.company_broker_dispatchers;

-- Create single unified policy for company_broker_dispatchers
CREATE POLICY "Company broker dispatchers unified policy" ON public.company_broker_dispatchers
FOR ALL TO authenticated
USING (
  broker_id IN (
    SELECT cb.id
    FROM company_brokers cb
    JOIN user_company_roles ucr ON cb.company_id = ucr.company_id
    WHERE ucr.user_id = (select auth.uid()) AND ucr.is_active = true
  )
)
WITH CHECK (
  broker_id IN (
    SELECT cb.id
    FROM company_brokers cb
    JOIN user_company_roles ucr ON cb.company_id = ucr.company_id
    WHERE ucr.user_id = (select auth.uid()) AND ucr.is_active = true
  )
);

-- 2. Fix company_brokers table
DROP POLICY IF EXISTS "Company members can delete company brokers" ON public.company_brokers;
DROP POLICY IF EXISTS "Company members can insert company brokers" ON public.company_brokers;
DROP POLICY IF EXISTS "Company members can update company brokers" ON public.company_brokers;
DROP POLICY IF EXISTS "Company members can view company brokers" ON public.company_brokers;

-- Create single unified policy for company_brokers
CREATE POLICY "Company brokers unified policy" ON public.company_brokers
FOR ALL TO authenticated
USING (
  NOT is_superadmin() AND company_id IN (
    SELECT ucr.company_id
    FROM user_company_roles ucr
    WHERE ucr.user_id = (select auth.uid()) 
    AND ucr.is_active = true 
    AND ucr.company_id IN (SELECT id FROM get_real_companies())
  )
)
WITH CHECK (
  company_id IN (
    SELECT ucr.company_id
    FROM user_company_roles ucr
    WHERE ucr.user_id = (select auth.uid()) AND ucr.is_active = true
  )
);

-- 3. Fix company_documents table
DROP POLICY IF EXISTS "Company documents access" ON public.company_documents;

-- Create single unified policy for company_documents
CREATE POLICY "Company documents unified policy" ON public.company_documents
FOR ALL TO authenticated
USING (
  company_id IN (
    SELECT ucr.company_id
    FROM user_company_roles ucr
    WHERE ucr.user_id = (select auth.uid()) AND ucr.is_active = true
  )
)
WITH CHECK (
  company_id IN (
    SELECT ucr.company_id
    FROM user_company_roles ucr
    WHERE ucr.user_id = (select auth.uid()) AND ucr.is_active = true
  )
);

-- 4. Fix company_drivers table
DROP POLICY IF EXISTS "Company drivers access" ON public.company_drivers;
DROP POLICY IF EXISTS "Users and company members can access company driver profiles" ON public.company_drivers;

-- Create single unified policy for company_drivers
CREATE POLICY "Company drivers unified policy" ON public.company_drivers
FOR ALL TO authenticated
USING (
  -- Users can access their own driver profile
  (select auth.uid()) = user_id
  OR
  -- Company members can access drivers in their company
  (NOT is_superadmin() AND user_id IN (
    SELECT ucr.user_id
    FROM user_company_roles ucr
    WHERE ucr.company_id IN (
      SELECT user_company_roles.company_id
      FROM user_company_roles
      WHERE user_company_roles.user_id = (select auth.uid()) 
      AND user_company_roles.is_active = true 
      AND user_company_roles.company_id IN (SELECT id FROM get_real_companies())
    ) AND ucr.is_active = true
  ))
)
WITH CHECK (
  (select auth.uid()) = user_id
);

-- Keep existing service role policies as they are separate and don't cause conflicts
-- No changes needed for service role policies

-- 5. Update statistics about the additional RLS optimization
INSERT INTO public.system_stats (stat_type, stat_value)
VALUES ('rls_policies_optimization_round2', jsonb_build_object(
  'timestamp', now(),
  'description', 'Consolidated remaining multiple permissive RLS policies',
  'tables_optimized', ARRAY['company_broker_dispatchers', 'company_brokers', 'company_documents', 'company_drivers'],
  'multiple_policies_removed', true,
  'auth_calls_optimized', true
));