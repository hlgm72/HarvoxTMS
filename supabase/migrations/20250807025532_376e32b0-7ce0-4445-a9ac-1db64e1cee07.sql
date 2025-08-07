-- Fix RLS performance issues: auth function optimization and duplicate policy removal

-- 1. Fix other_income table policies
DROP POLICY IF EXISTS "other_income_select" ON public.other_income;
DROP POLICY IF EXISTS "other_income_insert" ON public.other_income;  
DROP POLICY IF EXISTS "other_income_update" ON public.other_income;
DROP POLICY IF EXISTS "other_income_unified_select" ON public.other_income;
DROP POLICY IF EXISTS "other_income_unified_insert" ON public.other_income;
DROP POLICY IF EXISTS "other_income_unified_update" ON public.other_income;

-- Create optimized other_income policies
CREATE POLICY "other_income_optimized_select" ON public.other_income
FOR SELECT USING (
  (SELECT auth.role()) = 'authenticated' AND
  (SELECT auth.uid()) IS NOT NULL AND
  COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false AND
  ((SELECT auth.uid()) = user_id OR 
   payment_period_id IN (
     SELECT cpp.id FROM company_payment_periods cpp
     JOIN user_company_roles ucr ON cpp.company_id = ucr.company_id
     WHERE ucr.user_id = (SELECT auth.uid()) AND ucr.is_active = true
   ))
);

CREATE POLICY "other_income_optimized_insert" ON public.other_income
FOR INSERT WITH CHECK (
  (SELECT auth.role()) = 'authenticated' AND
  (SELECT auth.uid()) IS NOT NULL AND
  COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false AND
  payment_period_id IN (
    SELECT cpp.id FROM company_payment_periods cpp
    JOIN user_company_roles ucr ON cpp.company_id = ucr.company_id
    WHERE ucr.user_id = (SELECT auth.uid()) AND ucr.is_active = true AND NOT cpp.is_locked
  )
);

CREATE POLICY "other_income_optimized_update" ON public.other_income
FOR UPDATE USING (
  (SELECT auth.role()) = 'authenticated' AND
  (SELECT auth.uid()) IS NOT NULL AND
  COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false AND
  payment_period_id IN (
    SELECT cpp.id FROM company_payment_periods cpp
    JOIN user_company_roles ucr ON cpp.company_id = ucr.company_id
    WHERE ucr.user_id = (SELECT auth.uid()) AND ucr.is_active = true AND NOT cpp.is_locked
  )
) WITH CHECK (
  (SELECT auth.role()) = 'authenticated' AND
  (SELECT auth.uid()) IS NOT NULL AND
  COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false AND
  payment_period_id IN (
    SELECT cpp.id FROM company_payment_periods cpp
    JOIN user_company_roles ucr ON cpp.company_id = ucr.company_id
    WHERE ucr.user_id = (SELECT auth.uid()) AND ucr.is_active = true AND NOT cpp.is_locked
  )
);

-- 2. Fix loads table policies
DROP POLICY IF EXISTS "Loads company access policy" ON public.loads;
DROP POLICY IF EXISTS "loads_select" ON public.loads;
DROP POLICY IF EXISTS "loads_insert" ON public.loads;
DROP POLICY IF EXISTS "loads_update" ON public.loads;

-- Create optimized loads policies
CREATE POLICY "loads_optimized_select" ON public.loads
FOR SELECT USING (
  (SELECT auth.role()) = 'authenticated' AND
  (SELECT auth.uid()) IS NOT NULL AND
  COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false AND
  ((SELECT auth.uid()) = driver_user_id OR 
   (SELECT auth.uid()) = created_by OR
   payment_period_id IN (
     SELECT cpp.id FROM company_payment_periods cpp
     JOIN user_company_roles ucr ON cpp.company_id = ucr.company_id
     WHERE ucr.user_id = (SELECT auth.uid()) AND ucr.is_active = true
   ))
);

CREATE POLICY "loads_optimized_insert" ON public.loads
FOR INSERT WITH CHECK (
  (SELECT auth.role()) = 'authenticated' AND
  (SELECT auth.uid()) IS NOT NULL AND
  COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false AND
  ((SELECT auth.uid()) = created_by OR 
   payment_period_id IN (
     SELECT cpp.id FROM company_payment_periods cpp
     JOIN user_company_roles ucr ON cpp.company_id = ucr.company_id
     WHERE ucr.user_id = (SELECT auth.uid()) AND ucr.is_active = true
   ))
);

CREATE POLICY "loads_optimized_update" ON public.loads
FOR UPDATE USING (
  (SELECT auth.role()) = 'authenticated' AND
  (SELECT auth.uid()) IS NOT NULL AND
  COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false AND
  ((SELECT auth.uid()) = driver_user_id OR 
   (SELECT auth.uid()) = created_by OR
   payment_period_id IN (
     SELECT cpp.id FROM company_payment_periods cpp
     JOIN user_company_roles ucr ON cpp.company_id = ucr.company_id
     WHERE ucr.user_id = (SELECT auth.uid()) AND ucr.is_active = true
   ))
) WITH CHECK (
  (SELECT auth.role()) = 'authenticated' AND
  (SELECT auth.uid()) IS NOT NULL AND
  COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false AND
  ((SELECT auth.uid()) = created_by OR 
   payment_period_id IN (
     SELECT cpp.id FROM company_payment_periods cpp
     JOIN user_company_roles ucr ON cpp.company_id = ucr.company_id
     WHERE ucr.user_id = (SELECT auth.uid()) AND ucr.is_active = true
   ))
);

-- 3. Update load_stops policies with optimized auth calls
DROP POLICY IF EXISTS "load_stops_select_policy" ON public.load_stops;
DROP POLICY IF EXISTS "load_stops_insert_policy" ON public.load_stops;
DROP POLICY IF EXISTS "load_stops_update_policy" ON public.load_stops;
DROP POLICY IF EXISTS "load_stops_delete_policy" ON public.load_stops;

-- Create optimized load_stops policies
CREATE POLICY "load_stops_optimized_select" ON public.load_stops
FOR SELECT USING (
  (SELECT auth.role()) = 'authenticated' AND
  (SELECT auth.uid()) IS NOT NULL AND
  COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false AND
  load_id IN (
    SELECT l.id FROM public.loads l
    JOIN public.user_company_roles ucr ON (
      l.driver_user_id = ucr.user_id OR 
      l.created_by = ucr.user_id
    )
    WHERE ucr.user_id = (SELECT auth.uid()) 
    AND ucr.is_active = true
  )
);

CREATE POLICY "load_stops_optimized_insert" ON public.load_stops
FOR INSERT WITH CHECK (
  (SELECT auth.role()) = 'authenticated' AND
  (SELECT auth.uid()) IS NOT NULL AND
  COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false AND
  load_id IN (
    SELECT l.id FROM public.loads l
    JOIN public.user_company_roles ucr ON (
      l.driver_user_id = ucr.user_id OR 
      l.created_by = ucr.user_id
    )
    WHERE ucr.user_id = (SELECT auth.uid()) 
    AND ucr.is_active = true
  )
);

CREATE POLICY "load_stops_optimized_update" ON public.load_stops
FOR UPDATE USING (
  (SELECT auth.role()) = 'authenticated' AND
  (SELECT auth.uid()) IS NOT NULL AND
  COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false AND
  load_id IN (
    SELECT l.id FROM public.loads l
    JOIN public.user_company_roles ucr ON (
      l.driver_user_id = ucr.user_id OR 
      l.created_by = ucr.user_id
    )
    WHERE ucr.user_id = (SELECT auth.uid()) 
    AND ucr.is_active = true
  )
) WITH CHECK (
  (SELECT auth.role()) = 'authenticated' AND
  (SELECT auth.uid()) IS NOT NULL AND
  COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false AND
  load_id IN (
    SELECT l.id FROM public.loads l
    JOIN public.user_company_roles ucr ON (
      l.driver_user_id = ucr.user_id OR 
      l.created_by = ucr.user_id
    )
    WHERE ucr.user_id = (SELECT auth.uid()) 
    AND ucr.is_active = true
  )
);

CREATE POLICY "load_stops_optimized_delete" ON public.load_stops
FOR DELETE USING (
  (SELECT auth.role()) = 'authenticated' AND
  (SELECT auth.uid()) IS NOT NULL AND
  COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false AND
  load_id IN (
    SELECT l.id FROM public.loads l
    JOIN public.user_company_roles ucr ON (
      l.driver_user_id = ucr.user_id OR 
      l.created_by = ucr.user_id
    )
    WHERE ucr.user_id = (SELECT auth.uid()) 
    AND ucr.is_active = true
  )
);