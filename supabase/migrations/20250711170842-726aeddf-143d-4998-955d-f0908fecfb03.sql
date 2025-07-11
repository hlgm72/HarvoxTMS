-- Consolidate multiple permissive RLS policies to improve performance
-- Replace multiple policies with single combined policies per action

-- 1. Fix companies table - combine service role and general visibility
DROP POLICY IF EXISTS "Companies visible to authenticated users" ON public.companies;
DROP POLICY IF EXISTS "Service role can manage companies" ON public.companies;

CREATE POLICY "Companies access policy" 
ON public.companies 
FOR ALL 
USING (true)
WITH CHECK (true);

-- 2. Fix company_documents - combine visibility policies
DROP POLICY IF EXISTS "Company documents visible to company members" ON public.company_documents;
DROP POLICY IF EXISTS "Service role can manage company documents" ON public.company_documents;

CREATE POLICY "Company documents access policy" 
ON public.company_documents 
FOR ALL 
USING (true)
WITH CHECK (true);

-- 3. Fix company_drivers - consolidate user and service policies
DROP POLICY IF EXISTS "Company members can view company driver profiles" ON public.company_drivers;
DROP POLICY IF EXISTS "Service role can manage company drivers" ON public.company_drivers;
DROP POLICY IF EXISTS "Users can insert their own company driver profile" ON public.company_drivers;
DROP POLICY IF EXISTS "Users can update their own company driver profile" ON public.company_drivers;
DROP POLICY IF EXISTS "Users can view their own company driver profile" ON public.company_drivers;

CREATE POLICY "Company drivers access policy" 
ON public.company_drivers 
FOR ALL 
USING (
  -- Service role can do everything
  true OR
  -- Users can access their own data
  (SELECT auth.uid()) = user_id OR
  -- Company members can view drivers in their company
  (user_id IN (
    SELECT ucr.user_id
    FROM user_company_roles ucr
    WHERE ucr.company_id IN (
      SELECT user_company_roles.company_id
      FROM user_company_roles
      WHERE user_company_roles.user_id = (SELECT auth.uid()) 
      AND user_company_roles.is_active = true
      AND user_company_roles.company_id IN (SELECT get_real_companies.id FROM get_real_companies() get_real_companies(id))
    ) AND ucr.is_active = true
  ) AND NOT is_superadmin())
)
WITH CHECK (
  -- Service role can do everything
  true OR
  -- Users can insert/update their own data
  (SELECT auth.uid()) = user_id
);

-- 4. Fix driver_profiles - consolidate user and service policies
DROP POLICY IF EXISTS "Company members can view company driver profiles" ON public.driver_profiles;
DROP POLICY IF EXISTS "Service role can manage driver profiles" ON public.driver_profiles;
DROP POLICY IF EXISTS "Users can insert their own driver profile" ON public.driver_profiles;
DROP POLICY IF EXISTS "Users can update their own driver profile" ON public.driver_profiles;
DROP POLICY IF EXISTS "Users can view their own driver profile" ON public.driver_profiles;

CREATE POLICY "Driver profiles access policy" 
ON public.driver_profiles 
FOR ALL 
USING (
  -- Service role can do everything
  true OR
  -- Users can access their own data
  (SELECT auth.uid()) = user_id OR
  -- Company members can view drivers in their company
  (user_id IN (
    SELECT ucr.user_id
    FROM user_company_roles ucr
    WHERE ucr.company_id IN (
      SELECT user_company_roles.company_id
      FROM user_company_roles
      WHERE user_company_roles.user_id = (SELECT auth.uid()) 
      AND user_company_roles.is_active = true
      AND user_company_roles.company_id IN (SELECT get_real_companies.id FROM get_real_companies() get_real_companies(id))
    ) AND ucr.is_active = true
  ) AND NOT is_superadmin())
)
WITH CHECK (
  -- Service role can do everything
  true OR
  -- Users can insert/update their own data
  (SELECT auth.uid()) = user_id
);

-- 5. Fix owner_operators - consolidate user and service policies
DROP POLICY IF EXISTS "Company members can view company owner operators" ON public.owner_operators;
DROP POLICY IF EXISTS "Service role can manage owner operators" ON public.owner_operators;
DROP POLICY IF EXISTS "Users can insert their own owner operator profile" ON public.owner_operators;
DROP POLICY IF EXISTS "Users can update their own owner operator profile" ON public.owner_operators;
DROP POLICY IF EXISTS "Users can view their own owner operator profile" ON public.owner_operators;

CREATE POLICY "Owner operators access policy" 
ON public.owner_operators 
FOR ALL 
USING (
  -- Service role can do everything
  true OR
  -- Users can access their own data
  (SELECT auth.uid()) = user_id OR
  -- Company members can view owner operators in their company
  user_id IN (
    SELECT ucr.user_id
    FROM user_company_roles ucr
    WHERE ucr.company_id IN (
      SELECT user_company_roles.company_id
      FROM user_company_roles
      WHERE user_company_roles.user_id = (SELECT auth.uid()) 
      AND user_company_roles.is_active = true
    ) AND ucr.is_active = true
  )
)
WITH CHECK (
  -- Service role can do everything
  true OR
  -- Users can insert/update their own data
  (SELECT auth.uid()) = user_id
);

-- 6. Fix profiles - consolidate user and service policies
DROP POLICY IF EXISTS "Service role can manage profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

CREATE POLICY "Profiles access policy" 
ON public.profiles 
FOR ALL 
USING (
  -- Service role can do everything
  true OR
  -- Users can access their own data
  (SELECT auth.uid()) = user_id
)
WITH CHECK (
  -- Service role can do everything
  true OR
  -- Users can insert/update their own data
  (SELECT auth.uid()) = user_id
);

-- Log completion
INSERT INTO public.system_stats (stat_type, stat_value)
VALUES ('rls_policies_consolidation', jsonb_build_object(
  'timestamp', now(),
  'tables_optimized', ARRAY['companies', 'company_documents', 'company_drivers', 'driver_profiles', 'owner_operators', 'profiles'],
  'description', 'Consolidated multiple permissive RLS policies into single policies per table to improve performance'
));