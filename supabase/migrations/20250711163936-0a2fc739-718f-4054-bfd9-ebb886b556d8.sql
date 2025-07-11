-- Optimize RLS policies to improve performance by preventing re-evaluation of auth.uid() for each row
-- Replace auth.uid() with (select auth.uid()) in all RLS policies

-- Drop existing policies that need optimization
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

DROP POLICY IF EXISTS "Users can view their own driver profile" ON public.driver_profiles;
DROP POLICY IF EXISTS "Users can update their own driver profile" ON public.driver_profiles;
DROP POLICY IF EXISTS "Users can insert their own driver profile" ON public.driver_profiles;

DROP POLICY IF EXISTS "Users can view their own company driver profile" ON public.company_drivers;
DROP POLICY IF EXISTS "Users can update their own company driver profile" ON public.company_drivers;
DROP POLICY IF EXISTS "Users can insert their own company driver profile" ON public.company_drivers;

DROP POLICY IF EXISTS "Users can view their own owner operator profile" ON public.owner_operators;
DROP POLICY IF EXISTS "Users can update their own owner operator profile" ON public.owner_operators;
DROP POLICY IF EXISTS "Users can insert their own owner operator profile" ON public.owner_operators;

DROP POLICY IF EXISTS "Users can view their own fuel expenses" ON public.fuel_expenses;
DROP POLICY IF EXISTS "Users can view their own fuel limits" ON public.fuel_limits;
DROP POLICY IF EXISTS "Drivers can view their own loads" ON public.loads;
DROP POLICY IF EXISTS "Users can view their own payment periods" ON public.payment_periods;
DROP POLICY IF EXISTS "Users can view their own other income" ON public.other_income;
DROP POLICY IF EXISTS "Users can view their own pending expenses" ON public.pending_expenses;

-- Recreate optimized policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
FOR SELECT USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can update their own profile" ON public.profiles
FOR UPDATE USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

-- Recreate optimized policies for driver_profiles
CREATE POLICY "Users can view their own driver profile" ON public.driver_profiles
FOR SELECT USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can update their own driver profile" ON public.driver_profiles
FOR UPDATE USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert their own driver profile" ON public.driver_profiles
FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

-- Recreate optimized policies for company_drivers
CREATE POLICY "Users can view their own company driver profile" ON public.company_drivers
FOR SELECT USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can update their own company driver profile" ON public.company_drivers
FOR UPDATE USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert their own company driver profile" ON public.company_drivers
FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

-- Recreate optimized policies for owner_operators
CREATE POLICY "Users can view their own owner operator profile" ON public.owner_operators
FOR SELECT USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can update their own owner operator profile" ON public.owner_operators
FOR UPDATE USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert their own owner operator profile" ON public.owner_operators
FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

-- Recreate optimized policies for fuel_expenses
CREATE POLICY "Users can view their own fuel expenses" ON public.fuel_expenses
FOR SELECT USING ((select auth.uid()) = driver_user_id);

-- Recreate optimized policies for fuel_limits
CREATE POLICY "Users can view their own fuel limits" ON public.fuel_limits
FOR SELECT USING ((select auth.uid()) = driver_user_id);

-- Recreate optimized policies for loads
CREATE POLICY "Drivers can view their own loads" ON public.loads
FOR SELECT USING ((select auth.uid()) = driver_user_id);

-- Recreate optimized policies for payment_periods
CREATE POLICY "Users can view their own payment periods" ON public.payment_periods
FOR SELECT USING ((select auth.uid()) = driver_user_id);

-- Recreate optimized policies for other_income
CREATE POLICY "Users can view their own other income" ON public.other_income
FOR SELECT USING ((select auth.uid()) = driver_user_id);

-- Recreate optimized policies for pending_expenses
CREATE POLICY "Users can view their own pending expenses" ON public.pending_expenses
FOR SELECT USING ((select auth.uid()) = driver_user_id);

-- Update complex policies that use auth.uid() in subqueries
DROP POLICY IF EXISTS "Company members can view company brokers" ON public.company_brokers;
CREATE POLICY "Company members can view company brokers" ON public.company_brokers
FOR SELECT USING (
  (NOT is_superadmin()) AND 
  (company_id IN (
    SELECT ucr.company_id
    FROM user_company_roles ucr
    WHERE ucr.user_id = (select auth.uid()) 
    AND ucr.is_active = true 
    AND ucr.company_id IN (SELECT get_real_companies.id FROM get_real_companies() get_real_companies(id))
  ))
);

DROP POLICY IF EXISTS "Company members can insert company brokers" ON public.company_brokers;
CREATE POLICY "Company members can insert company brokers" ON public.company_brokers
FOR INSERT WITH CHECK (
  company_id IN (
    SELECT ucr.company_id
    FROM user_company_roles ucr
    WHERE ucr.user_id = (select auth.uid()) AND ucr.is_active = true
  )
);

DROP POLICY IF EXISTS "Company members can update company brokers" ON public.company_brokers;
CREATE POLICY "Company members can update company brokers" ON public.company_brokers
FOR UPDATE USING (
  company_id IN (
    SELECT ucr.company_id
    FROM user_company_roles ucr
    WHERE ucr.user_id = (select auth.uid()) AND ucr.is_active = true
  )
);

DROP POLICY IF EXISTS "Company members can delete company brokers" ON public.company_brokers;
CREATE POLICY "Company members can delete company brokers" ON public.company_brokers
FOR DELETE USING (
  company_id IN (
    SELECT ucr.company_id
    FROM user_company_roles ucr
    WHERE ucr.user_id = (select auth.uid()) AND ucr.is_active = true
  )
);

-- Update payment_methods policies
DROP POLICY IF EXISTS "Company members can view payment methods" ON public.payment_methods;
CREATE POLICY "Company members can view payment methods" ON public.payment_methods
FOR SELECT USING (
  company_id IN (
    SELECT ucr.company_id
    FROM user_company_roles ucr
    WHERE ucr.user_id = (select auth.uid()) AND ucr.is_active = true
  )
);

DROP POLICY IF EXISTS "Company owners can manage payment methods" ON public.payment_methods;
CREATE POLICY "Company owners can manage payment methods" ON public.payment_methods
FOR ALL USING (
  company_id IN (
    SELECT ucr.company_id
    FROM user_company_roles ucr
    WHERE ucr.user_id = (select auth.uid()) 
    AND ucr.role = ANY (ARRAY['company_owner'::user_role, 'senior_dispatcher'::user_role]) 
    AND ucr.is_active = true
  )
);

-- Log completion
INSERT INTO public.system_stats (stat_type, stat_value)
VALUES ('rls_performance_optimization', jsonb_build_object(
  'timestamp', now(),
  'optimized_tables', ARRAY['profiles', 'driver_profiles', 'company_drivers', 'owner_operators', 'fuel_expenses', 'fuel_limits', 'loads', 'payment_periods', 'other_income', 'pending_expenses', 'company_brokers', 'payment_methods'],
  'improvement', 'Replaced auth.uid() with (select auth.uid()) to prevent re-evaluation per row'
));