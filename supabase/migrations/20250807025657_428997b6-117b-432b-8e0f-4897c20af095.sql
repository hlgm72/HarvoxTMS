-- Fix all RLS performance and security issues from linter warnings

-- 1. Fix function search_path mutable issue
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

-- 2. Drop old insecure load_stops policies that allow anonymous access
DROP POLICY IF EXISTS "Load stops company access - delete" ON public.load_stops;
DROP POLICY IF EXISTS "Load stops company access - select" ON public.load_stops;
DROP POLICY IF EXISTS "Load stops company access - update" ON public.load_stops;
DROP POLICY IF EXISTS "Load stops company access - insert" ON public.load_stops;

-- 3. Optimize auth function calls in RLS policies for performance

-- Drop and recreate other_income policies with optimized auth calls
DROP POLICY IF EXISTS "other_income_select" ON public.other_income;
DROP POLICY IF EXISTS "other_income_insert" ON public.other_income;
DROP POLICY IF EXISTS "other_income_update" ON public.other_income;
DROP POLICY IF EXISTS "other_income_unified_select" ON public.other_income;
DROP POLICY IF EXISTS "other_income_unified_insert" ON public.other_income;
DROP POLICY IF EXISTS "other_income_unified_update" ON public.other_income;

-- Create single optimized policies for other_income
CREATE POLICY "other_income_company_select" ON public.other_income
FOR SELECT USING (
  ((SELECT auth.role()) = 'authenticated' AND 
   (SELECT auth.uid()) IS NOT NULL AND 
   COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false) AND
  (payment_period_id IN (
    SELECT dpc.id FROM driver_period_calculations dpc
    JOIN company_payment_periods cpp ON dpc.company_payment_period_id = cpp.id
    JOIN user_company_roles ucr ON cpp.company_id = ucr.company_id
    WHERE ucr.user_id = (SELECT auth.uid()) AND ucr.is_active = true
  ) OR user_id = (SELECT auth.uid()))
);

CREATE POLICY "other_income_company_insert" ON public.other_income
FOR INSERT WITH CHECK (
  ((SELECT auth.role()) = 'authenticated' AND 
   (SELECT auth.uid()) IS NOT NULL AND 
   COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false) AND
  (payment_period_id IN (
    SELECT dpc.id FROM driver_period_calculations dpc
    JOIN company_payment_periods cpp ON dpc.company_payment_period_id = cpp.id
    JOIN user_company_roles ucr ON cpp.company_id = ucr.company_id
    WHERE ucr.user_id = (SELECT auth.uid()) AND ucr.is_active = true AND NOT cpp.is_locked
  )) AND user_id = (SELECT auth.uid())
);

CREATE POLICY "other_income_company_update" ON public.other_income
FOR UPDATE USING (
  ((SELECT auth.role()) = 'authenticated' AND 
   (SELECT auth.uid()) IS NOT NULL AND 
   COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false) AND
  (payment_period_id IN (
    SELECT dpc.id FROM driver_period_calculations dpc
    JOIN company_payment_periods cpp ON dpc.company_payment_period_id = cpp.id
    JOIN user_company_roles ucr ON cpp.company_id = ucr.company_id
    WHERE ucr.user_id = (SELECT auth.uid()) AND ucr.is_active = true AND NOT cpp.is_locked
  )) AND user_id = (SELECT auth.uid())
) WITH CHECK (
  ((SELECT auth.role()) = 'authenticated' AND 
   (SELECT auth.uid()) IS NOT NULL AND 
   COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false) AND
  (payment_period_id IN (
    SELECT dpc.id FROM driver_period_calculations dpc
    JOIN company_payment_periods cpp ON dpc.company_payment_period_id = cpp.id
    JOIN user_company_roles ucr ON cpp.company_id = ucr.company_id
    WHERE ucr.user_id = (SELECT auth.uid()) AND ucr.is_active = true AND NOT cpp.is_locked
  )) AND user_id = (SELECT auth.uid())
);

-- Drop and recreate loads policies with optimized auth calls
DROP POLICY IF EXISTS "Loads company access policy" ON public.loads;
DROP POLICY IF EXISTS "loads_select" ON public.loads;
DROP POLICY IF EXISTS "loads_insert" ON public.loads;
DROP POLICY IF EXISTS "loads_update" ON public.loads;

-- Create single optimized policies for loads
CREATE POLICY "loads_company_access" ON public.loads
FOR ALL USING (
  ((SELECT auth.role()) = 'authenticated' AND 
   (SELECT auth.uid()) IS NOT NULL AND 
   COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false) AND
  ((SELECT auth.uid()) = driver_user_id OR 
   (SELECT auth.uid()) = created_by OR
   payment_period_id IN (
     SELECT cpp.id FROM company_payment_periods cpp
     JOIN user_company_roles ucr ON cpp.company_id = ucr.company_id
     WHERE ucr.user_id = (SELECT auth.uid()) AND ucr.is_active = true
   ))
) WITH CHECK (
  ((SELECT auth.role()) = 'authenticated' AND 
   (SELECT auth.uid()) IS NOT NULL AND 
   COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false) AND
  (payment_period_id IN (
    SELECT cpp.id FROM company_payment_periods cpp
    JOIN user_company_roles ucr ON cpp.company_id = ucr.company_id
    WHERE ucr.user_id = (SELECT auth.uid()) AND ucr.is_active = true AND NOT cpp.is_locked
  ))
);

-- Drop and recreate load_stops policies with optimized auth calls
DROP POLICY IF EXISTS "load_stops_select_policy" ON public.load_stops;
DROP POLICY IF EXISTS "load_stops_insert_policy" ON public.load_stops;
DROP POLICY IF EXISTS "load_stops_update_policy" ON public.load_stops;
DROP POLICY IF EXISTS "load_stops_delete_policy" ON public.load_stops;

-- Create optimized policies for load_stops
CREATE POLICY "load_stops_company_access" ON public.load_stops
FOR ALL USING (
  ((SELECT auth.role()) = 'authenticated' AND 
   (SELECT auth.uid()) IS NOT NULL AND 
   COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false) AND
  load_id IN (
    SELECT l.id FROM loads l
    WHERE ((SELECT auth.uid()) = l.driver_user_id OR 
           (SELECT auth.uid()) = l.created_by OR
           l.payment_period_id IN (
             SELECT cpp.id FROM company_payment_periods cpp
             JOIN user_company_roles ucr ON cpp.company_id = ucr.company_id
             WHERE ucr.user_id = (SELECT auth.uid()) AND ucr.is_active = true
           ))
  )
) WITH CHECK (
  ((SELECT auth.role()) = 'authenticated' AND 
   (SELECT auth.uid()) IS NOT NULL AND 
   COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false) AND
  load_id IN (
    SELECT l.id FROM loads l
    JOIN company_payment_periods cpp ON l.payment_period_id = cpp.id
    JOIN user_company_roles ucr ON cpp.company_id = ucr.company_id
    WHERE ucr.user_id = (SELECT auth.uid()) AND ucr.is_active = true AND NOT cpp.is_locked
  )
);