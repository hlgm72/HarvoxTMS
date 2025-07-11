-- Optimize RLS policies for better performance
-- Replace auth.uid() with (select auth.uid()) to avoid re-evaluation for each row

-- Drop existing policies for profiles table
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

-- Recreate optimized policies for profiles
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK ((select auth.uid()) = user_id);

-- Let's also optimize other tables that might have similar issues
-- Drop and recreate policies for driver_profiles
DROP POLICY IF EXISTS "Users can view their own driver profile" ON public.driver_profiles;
DROP POLICY IF EXISTS "Users can update their own driver profile" ON public.driver_profiles;
DROP POLICY IF EXISTS "Users can insert their own driver profile" ON public.driver_profiles;

CREATE POLICY "Users can view their own driver profile" 
ON public.driver_profiles 
FOR SELECT 
USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can update their own driver profile" 
ON public.driver_profiles 
FOR UPDATE 
USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert their own driver profile" 
ON public.driver_profiles 
FOR INSERT 
WITH CHECK ((select auth.uid()) = user_id);

-- Optimize company_drivers policies
DROP POLICY IF EXISTS "Users can view their own company driver profile" ON public.company_drivers;
DROP POLICY IF EXISTS "Users can update their own company driver profile" ON public.company_drivers;
DROP POLICY IF EXISTS "Users can insert their own company driver profile" ON public.company_drivers;

CREATE POLICY "Users can view their own company driver profile" 
ON public.company_drivers 
FOR SELECT 
USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can update their own company driver profile" 
ON public.company_drivers 
FOR UPDATE 
USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert their own company driver profile" 
ON public.company_drivers 
FOR INSERT 
WITH CHECK ((select auth.uid()) = user_id);

-- Optimize owner_operators policies
DROP POLICY IF EXISTS "Users can view their own owner operator profile" ON public.owner_operators;
DROP POLICY IF EXISTS "Users can update their own owner operator profile" ON public.owner_operators;
DROP POLICY IF EXISTS "Users can insert their own owner operator profile" ON public.owner_operators;

CREATE POLICY "Users can view their own owner operator profile" 
ON public.owner_operators 
FOR SELECT 
USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can update their own owner operator profile" 
ON public.owner_operators 
FOR UPDATE 
USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert their own owner operator profile" 
ON public.owner_operators 
FOR INSERT 
WITH CHECK ((select auth.uid()) = user_id);

-- Optimize fuel_expenses policies
DROP POLICY IF EXISTS "Users can view their own fuel expenses" ON public.fuel_expenses;

CREATE POLICY "Users can view their own fuel expenses" 
ON public.fuel_expenses 
FOR SELECT 
USING ((select auth.uid()) = driver_user_id);

-- Optimize fuel_limits policies
DROP POLICY IF EXISTS "Users can view their own fuel limits" ON public.fuel_limits;

CREATE POLICY "Users can view their own fuel limits" 
ON public.fuel_limits 
FOR SELECT 
USING ((select auth.uid()) = driver_user_id);

-- Optimize loads policies
DROP POLICY IF EXISTS "Drivers can view their own loads" ON public.loads;

CREATE POLICY "Drivers can view their own loads" 
ON public.loads 
FOR SELECT 
USING ((select auth.uid()) = driver_user_id);

-- Optimize payment_periods policies
DROP POLICY IF EXISTS "Users can view their own payment periods" ON public.payment_periods;

CREATE POLICY "Users can view their own payment periods" 
ON public.payment_periods 
FOR SELECT 
USING ((select auth.uid()) = driver_user_id);

-- Optimize other_income policies
DROP POLICY IF EXISTS "Users can view their own other income" ON public.other_income;

CREATE POLICY "Users can view their own other income" 
ON public.other_income 
FOR SELECT 
USING ((select auth.uid()) = driver_user_id);

-- Optimize pending_expenses policies
DROP POLICY IF EXISTS "Users can view their own pending expenses" ON public.pending_expenses;

CREATE POLICY "Users can view their own pending expenses" 
ON public.pending_expenses 
FOR SELECT 
USING ((select auth.uid()) = driver_user_id);

-- Optimize complex policies that use auth.uid() in subqueries
-- For company member policies, we need to optimize differently since they use auth.uid() in subqueries

-- Update user_company_roles policies to be more efficient
DROP POLICY IF EXISTS "Company members can view payment methods" ON public.payment_methods;

CREATE POLICY "Company members can view payment methods" 
ON public.payment_methods 
FOR SELECT 
USING (company_id IN ( 
  SELECT ucr.company_id
  FROM user_company_roles ucr
  WHERE ucr.user_id = (select auth.uid()) AND ucr.is_active = true
));