-- Revert problematic policy consolidation and create efficient policies
-- The previous consolidation created overly complex policies that hurt performance

-- 1. Fix companies - create simple efficient policies
DROP POLICY IF EXISTS "Companies access policy" ON public.companies;
CREATE POLICY "Companies visible to all authenticated users" ON public.companies FOR SELECT USING (true);
CREATE POLICY "Service role can manage companies" ON public.companies FOR ALL USING (true) WITH CHECK (true);

-- 2. Fix company_documents - separate policies for better performance  
DROP POLICY IF EXISTS "Company documents access policy" ON public.company_documents;
CREATE POLICY "Company documents visible to all" ON public.company_documents FOR SELECT USING (true);
CREATE POLICY "Service role can manage company documents" ON public.company_documents FOR ALL USING (true) WITH CHECK (true);

-- 3. Fix company_drivers - create efficient separate policies
DROP POLICY IF EXISTS "Company drivers access policy" ON public.company_drivers;

CREATE POLICY "Users can view their own company driver profile" ON public.company_drivers 
FOR SELECT USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can manage their own company driver profile" ON public.company_drivers 
FOR ALL USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Company members can view company drivers" ON public.company_drivers 
FOR SELECT USING (
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
);

CREATE POLICY "Service role can manage company drivers" ON public.company_drivers 
FOR ALL USING (true) WITH CHECK (true);

-- 4. Fix driver_profiles - create efficient separate policies
DROP POLICY IF EXISTS "Driver profiles access policy" ON public.driver_profiles;

CREATE POLICY "Users can view their own driver profile" ON public.driver_profiles 
FOR SELECT USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can manage their own driver profile" ON public.driver_profiles 
FOR ALL USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Company members can view driver profiles" ON public.driver_profiles 
FOR SELECT USING (
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
);

CREATE POLICY "Service role can manage driver profiles" ON public.driver_profiles 
FOR ALL USING (true) WITH CHECK (true);

-- 5. Fix owner_operators - create efficient separate policies
DROP POLICY IF EXISTS "Owner operators access policy" ON public.owner_operators;

CREATE POLICY "Users can view their own owner operator profile" ON public.owner_operators 
FOR SELECT USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can manage their own owner operator profile" ON public.owner_operators 
FOR ALL USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Company members can view owner operators" ON public.owner_operators 
FOR SELECT USING (
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
);

CREATE POLICY "Service role can manage owner operators" ON public.owner_operators 
FOR ALL USING (true) WITH CHECK (true);

-- 6. Fix profiles - create efficient separate policies
DROP POLICY IF EXISTS "Profiles access policy" ON public.profiles;

CREATE POLICY "Users can view their own profile" ON public.profiles 
FOR SELECT USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can manage their own profile" ON public.profiles 
FOR ALL USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Service role can manage profiles" ON public.profiles 
FOR ALL USING (true) WITH CHECK (true);

-- Log the revert
INSERT INTO public.system_stats (stat_type, stat_value)
VALUES ('rls_policies_revert_and_fix', jsonb_build_object(
  'timestamp', now(),
  'tables_fixed', ARRAY['companies', 'company_documents', 'company_drivers', 'driver_profiles', 'owner_operators', 'profiles'],
  'description', 'Reverted problematic policy consolidation and created efficient separate policies'
));