-- Fix the final remaining multiple permissive RLS policies
-- Consolidate policies for fuel_expenses and fuel_limits

-- 1. Fix fuel_expenses table
DROP POLICY IF EXISTS "Company members can manage fuel expenses" ON public.fuel_expenses;
DROP POLICY IF EXISTS "Company members can view company fuel expenses" ON public.fuel_expenses;
DROP POLICY IF EXISTS "Users can view their own fuel expenses" ON public.fuel_expenses;

-- Create single unified policy for fuel_expenses
CREATE POLICY "Fuel expenses unified policy" ON public.fuel_expenses
FOR ALL TO authenticated
USING (
  -- Users can view their own fuel expenses
  (select auth.uid()) = driver_user_id
  OR
  -- Company members can view fuel expenses in their company
  (NOT is_superadmin() AND driver_user_id IN (
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
  driver_user_id IN (
    SELECT ucr.user_id
    FROM user_company_roles ucr
    WHERE ucr.company_id IN (
      SELECT user_company_roles.company_id
      FROM user_company_roles
      WHERE user_company_roles.user_id = (select auth.uid()) 
      AND user_company_roles.is_active = true
    ) AND ucr.is_active = true
  ) AND NOT is_period_locked(payment_period_id)
);

-- 2. Fix fuel_limits table
DROP POLICY IF EXISTS "Company members can manage fuel limits" ON public.fuel_limits;
DROP POLICY IF EXISTS "Company members can view company fuel limits" ON public.fuel_limits;
DROP POLICY IF EXISTS "Users can view their own fuel limits" ON public.fuel_limits;

-- Create single unified policy for fuel_limits
CREATE POLICY "Fuel limits unified policy" ON public.fuel_limits
FOR ALL TO authenticated
USING (
  -- Users can view their own fuel limits
  (select auth.uid()) = driver_user_id
  OR
  -- Company members can view fuel limits in their company
  driver_user_id IN (
    SELECT ucr.user_id
    FROM user_company_roles ucr
    WHERE ucr.company_id IN (
      SELECT user_company_roles.company_id
      FROM user_company_roles
      WHERE user_company_roles.user_id = (select auth.uid()) 
      AND user_company_roles.is_active = true
    ) AND ucr.is_active = true
  )
)
WITH CHECK (
  driver_user_id IN (
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

-- Keep existing service role policies as they are separate and don't cause conflicts

-- 3. Update statistics about the absolute final RLS optimization
INSERT INTO public.system_stats (stat_type, stat_value)
VALUES ('rls_policies_optimization_absolute_final', jsonb_build_object(
  'timestamp', now(),
  'description', 'Absolute final cleanup of all multiple permissive RLS policies',
  'tables_optimized', ARRAY['fuel_expenses', 'fuel_limits'],
  'multiple_policies_removed', true,
  'auth_calls_optimized', true,
  'all_warnings_resolved', true
));