-- Consolidate multiple permissive RLS policies to improve performance
-- This addresses the database linter warnings about multiple permissive policies

-- Fix companies table - consolidate policies
DROP POLICY IF EXISTS "Companies visible to authenticated users" ON public.companies;
DROP POLICY IF EXISTS "Service role can manage companies" ON public.companies;

-- Create single consolidated policy for companies
CREATE POLICY "Anyone can view companies, service role can manage" 
ON public.companies 
FOR ALL 
USING (true)
WITH CHECK (
  -- Only service role can modify
  current_setting('role') = 'service_role'
);

-- Fix company_documents table - consolidate policies
DROP POLICY IF EXISTS "Company documents visible to company members" ON public.company_documents;
DROP POLICY IF EXISTS "Service role can manage company documents" ON public.company_documents;

-- Create single consolidated policy for company_documents
CREATE POLICY "Service role can manage all company documents" 
ON public.company_documents 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Fix company_drivers table - consolidate policies
DROP POLICY IF EXISTS "Company members can view company driver profiles" ON public.company_drivers;
DROP POLICY IF EXISTS "Service role can manage company drivers" ON public.company_drivers;
DROP POLICY IF EXISTS "Users can insert their own company driver profile" ON public.company_drivers;
DROP POLICY IF EXISTS "Users can update their own company driver profile" ON public.company_drivers;
DROP POLICY IF EXISTS "Users can view their own company driver profile" ON public.company_drivers;

-- Create consolidated policies for company_drivers
CREATE POLICY "Users and company members can access company driver profiles" 
ON public.company_drivers 
FOR SELECT 
USING (
  -- Users can see their own profile
  ((select auth.uid()) = user_id)
  OR
  -- Company members can see profiles from their company (excluding superadmin access)
  ((NOT is_superadmin()) AND (user_id IN (
    SELECT ucr.user_id
    FROM user_company_roles ucr
    WHERE (
      ucr.company_id IN (
        SELECT user_company_roles.company_id
        FROM user_company_roles
        WHERE (
          (user_company_roles.user_id = (select auth.uid())) AND 
          (user_company_roles.is_active = true) AND 
          (user_company_roles.company_id IN (SELECT get_real_companies.id FROM get_real_companies() get_real_companies(id)))
        )
      ) AND 
      (ucr.is_active = true)
    )
  )))
);

CREATE POLICY "Users can manage their own company driver profile" 
ON public.company_drivers 
FOR ALL 
USING ((select auth.uid()) = user_id)
WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Service role can manage all company drivers" 
ON public.company_drivers 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Fix driver_profiles table - consolidate policies
DROP POLICY IF EXISTS "Company members can view company driver profiles" ON public.driver_profiles;
DROP POLICY IF EXISTS "Service role can manage driver profiles" ON public.driver_profiles;
DROP POLICY IF EXISTS "Users can insert their own driver profile" ON public.driver_profiles;
DROP POLICY IF EXISTS "Users can update their own driver profile" ON public.driver_profiles;
DROP POLICY IF EXISTS "Users can view their own driver profile" ON public.driver_profiles;

-- Create consolidated policies for driver_profiles
CREATE POLICY "Users and company members can access driver profiles" 
ON public.driver_profiles 
FOR SELECT 
USING (
  -- Users can see their own profile
  ((select auth.uid()) = user_id)
  OR
  -- Company members can see profiles from their company (excluding superadmin access)
  ((NOT is_superadmin()) AND (user_id IN (
    SELECT ucr.user_id
    FROM user_company_roles ucr
    WHERE (
      ucr.company_id IN (
        SELECT user_company_roles.company_id
        FROM user_company_roles
        WHERE (
          (user_company_roles.user_id = (select auth.uid())) AND 
          (user_company_roles.is_active = true) AND 
          (user_company_roles.company_id IN (SELECT get_real_companies.id FROM get_real_companies() get_real_companies(id)))
        )
      ) AND 
      (ucr.is_active = true)
    )
  )))
);

CREATE POLICY "Users can manage their own driver profile" 
ON public.driver_profiles 
FOR ALL 
USING ((select auth.uid()) = user_id)
WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Service role can manage all driver profiles" 
ON public.driver_profiles 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Fix owner_operators table - consolidate policies
DROP POLICY IF EXISTS "Company members can view company owner operators" ON public.owner_operators;
DROP POLICY IF EXISTS "Service role can manage owner operators" ON public.owner_operators;
DROP POLICY IF EXISTS "Users can insert their own owner operator profile" ON public.owner_operators;
DROP POLICY IF EXISTS "Users can update their own owner operator profile" ON public.owner_operators;
DROP POLICY IF EXISTS "Users can view their own owner operator profile" ON public.owner_operators;

-- Create consolidated policies for owner_operators
CREATE POLICY "Users and company members can access owner operator profiles" 
ON public.owner_operators 
FOR SELECT 
USING (
  -- Users can see their own profile
  ((select auth.uid()) = user_id)
  OR
  -- Company members can see profiles from their company
  (user_id IN (
    SELECT ucr.user_id
    FROM user_company_roles ucr
    WHERE (
      ucr.company_id IN (
        SELECT user_company_roles.company_id
        FROM user_company_roles
        WHERE (
          (user_company_roles.user_id = (select auth.uid())) AND 
          (user_company_roles.is_active = true)
        )
      ) AND 
      (ucr.is_active = true)
    )
  ))
);

CREATE POLICY "Users can manage their own owner operator profile" 
ON public.owner_operators 
FOR ALL 
USING ((select auth.uid()) = user_id)
WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Service role can manage all owner operators" 
ON public.owner_operators 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Fix profiles table - consolidate policies
DROP POLICY IF EXISTS "Service role can manage profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

-- Create consolidated policies for profiles
CREATE POLICY "Users can manage their own profile" 
ON public.profiles 
FOR ALL 
USING ((select auth.uid()) = user_id)
WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Service role can manage all profiles" 
ON public.profiles 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Log completion
INSERT INTO public.system_stats (stat_type, stat_value)
VALUES ('rls_multiple_permissive_policies_consolidation', jsonb_build_object(
  'timestamp', now(),
  'tables_optimized', ARRAY['companies', 'company_documents', 'company_drivers', 'driver_profiles', 'owner_operators', 'profiles'],
  'description', 'Consolidated multiple permissive RLS policies to improve performance and reduce database linter warnings'
));