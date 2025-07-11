-- Fix remaining multiple permissive RLS policies for driver_profiles and expense_instances

-- 1. Fix driver_profiles table
DROP POLICY IF EXISTS "Driver profiles access" ON public.driver_profiles;
DROP POLICY IF EXISTS "Users and company members can access driver profiles" ON public.driver_profiles;

-- Create single unified policy for driver_profiles
CREATE POLICY "Driver profiles unified policy" ON public.driver_profiles
FOR ALL TO authenticated
USING (
  -- Users can access their own driver profile
  (select auth.uid()) = user_id
  OR
  -- Company members can access driver profiles in their company
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

-- 2. Fix expense_instances table
DROP POLICY IF EXISTS "Company members can manage expense instances" ON public.expense_instances;
DROP POLICY IF EXISTS "Company members can view expense instances" ON public.expense_instances;

-- Create single unified policy for expense_instances
CREATE POLICY "Expense instances unified policy" ON public.expense_instances
FOR ALL TO authenticated
USING (
  payment_period_id IN (
    SELECT pp.id
    FROM payment_periods pp
    JOIN user_company_roles ucr ON pp.driver_user_id = ucr.user_id
    WHERE ucr.company_id IN (
      SELECT user_company_roles.company_id
      FROM user_company_roles
      WHERE user_company_roles.user_id = (select auth.uid()) 
      AND user_company_roles.is_active = true
    ) AND ucr.is_active = true
  )
)
WITH CHECK (
  payment_period_id IN (
    SELECT pp.id
    FROM payment_periods pp
    JOIN user_company_roles ucr ON pp.driver_user_id = ucr.user_id
    WHERE ucr.company_id IN (
      SELECT user_company_roles.company_id
      FROM user_company_roles
      WHERE user_company_roles.user_id = (select auth.uid()) 
      AND user_company_roles.is_active = true
    ) AND ucr.is_active = true
  ) AND NOT is_period_locked(payment_period_id)
);

-- Keep existing service role policies as they are separate and don't cause conflicts

-- 3. Update statistics about the final RLS optimization
INSERT INTO public.system_stats (stat_type, stat_value)
VALUES ('rls_policies_optimization_final', jsonb_build_object(
  'timestamp', now(),
  'description', 'Final consolidation of remaining multiple permissive RLS policies',
  'tables_optimized', ARRAY['driver_profiles', 'expense_instances'],
  'multiple_policies_removed', true,
  'auth_calls_optimized', true
));