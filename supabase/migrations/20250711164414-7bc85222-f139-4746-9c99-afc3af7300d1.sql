-- Final RLS optimization to fix remaining auth.uid() performance issues
-- Replace auth.uid() with (select auth.uid()) in all remaining policies

-- Fix user_company_roles policies
DROP POLICY IF EXISTS "Users can view their own company roles" ON public.user_company_roles;
DROP POLICY IF EXISTS "Users can update their own company roles" ON public.user_company_roles;
DROP POLICY IF EXISTS "Users can insert their own company roles" ON public.user_company_roles;

CREATE POLICY "Users can view their own company roles" ON public.user_company_roles
FOR SELECT USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can update their own company roles" ON public.user_company_roles
FOR UPDATE USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert their own company roles" ON public.user_company_roles
FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

-- Fix remaining driver_profiles policies
DROP POLICY IF EXISTS "Company members can view company driver profiles" ON public.driver_profiles;
CREATE POLICY "Company members can view company driver profiles" ON public.driver_profiles
FOR SELECT USING (
  (NOT is_superadmin()) AND 
  (user_id IN (
    SELECT ucr.user_id
    FROM user_company_roles ucr
    WHERE ucr.company_id IN (
      SELECT user_company_roles.company_id
      FROM user_company_roles
      WHERE user_company_roles.user_id = (select auth.uid()) 
      AND user_company_roles.is_active = true 
      AND user_company_roles.company_id IN (
        SELECT get_real_companies.id FROM get_real_companies() get_real_companies(id)
      )
    ) AND ucr.is_active = true
  ))
);

-- Fix owner_operators policies
DROP POLICY IF EXISTS "Company members can view company owner operators" ON public.owner_operators;
CREATE POLICY "Company members can view company owner operators" ON public.owner_operators
FOR SELECT USING (
  user_id IN (
    SELECT ucr.user_id
    FROM user_company_roles ucr
    WHERE ucr.company_id IN (
      SELECT user_company_roles.company_id
      FROM user_company_roles
      WHERE user_company_roles.user_id = (select auth.uid()) 
      AND user_company_roles.is_active = true
    ) AND ucr.is_active = true
  )
);

-- Fix company_drivers policies that might still have issues
DROP POLICY IF EXISTS "Company members can view company driver profiles" ON public.company_drivers;
CREATE POLICY "Company members can view company driver profiles" ON public.company_drivers
FOR SELECT USING (
  (NOT is_superadmin()) AND 
  (user_id IN (
    SELECT ucr.user_id
    FROM user_company_roles ucr
    WHERE ucr.company_id IN (
      SELECT user_company_roles.company_id
      FROM user_company_roles
      WHERE user_company_roles.user_id = (select auth.uid()) 
      AND user_company_roles.is_active = true 
      AND user_company_roles.company_id IN (
        SELECT get_real_companies.id FROM get_real_companies() get_real_companies(id)
      )
    ) AND ucr.is_active = true
  ))
);

-- Fix any remaining fuel_expenses policies
DROP POLICY IF EXISTS "Company members can view company fuel expenses" ON public.fuel_expenses;
CREATE POLICY "Company members can view company fuel expenses" ON public.fuel_expenses
FOR SELECT USING (
  (NOT is_superadmin()) AND 
  (driver_user_id IN (
    SELECT ucr.user_id
    FROM user_company_roles ucr
    WHERE ucr.company_id IN (
      SELECT user_company_roles.company_id
      FROM user_company_roles
      WHERE user_company_roles.user_id = (select auth.uid()) 
      AND user_company_roles.is_active = true 
      AND user_company_roles.company_id IN (
        SELECT get_real_companies.id FROM get_real_companies() get_real_companies(id)
      )
    ) AND ucr.is_active = true
  ))
);

-- Fix loads policies
DROP POLICY IF EXISTS "Company members can view company loads" ON public.loads;
CREATE POLICY "Company members can view company loads" ON public.loads
FOR SELECT USING (
  (NOT is_superadmin()) AND 
  (driver_user_id IN (
    SELECT ucr.user_id
    FROM user_company_roles ucr
    WHERE ucr.company_id IN (
      SELECT user_company_roles.company_id
      FROM user_company_roles
      WHERE user_company_roles.user_id = (select auth.uid()) 
      AND user_company_roles.is_active = true 
      AND user_company_roles.company_id IN (
        SELECT get_real_companies.id FROM get_real_companies() get_real_companies(id)
      )
    ) AND ucr.is_active = true
  ))
);

-- Fix payment_periods policies
DROP POLICY IF EXISTS "Company members can view company payment periods" ON public.payment_periods;
CREATE POLICY "Company members can view company payment periods" ON public.payment_periods
FOR SELECT USING (
  (NOT is_superadmin()) AND 
  (driver_user_id IN (
    SELECT ucr.user_id
    FROM user_company_roles ucr
    WHERE ucr.company_id IN (
      SELECT user_company_roles.company_id
      FROM user_company_roles
      WHERE user_company_roles.user_id = (select auth.uid()) 
      AND user_company_roles.is_active = true 
      AND user_company_roles.company_id IN (
        SELECT get_real_companies.id FROM get_real_companies() get_real_companies(id)
      )
    ) AND ucr.is_active = true
  ))
);

-- Log completion of final optimization
INSERT INTO public.system_stats (stat_type, stat_value)
VALUES ('final_rls_optimization', jsonb_build_object(
  'timestamp', now(),
  'optimized_tables', ARRAY['user_company_roles', 'driver_profiles', 'owner_operators', 'company_drivers', 'fuel_expenses', 'loads', 'payment_periods'],
  'improvement', 'Final optimization - replaced all remaining auth.uid() with (select auth.uid()) to eliminate performance warnings'
));