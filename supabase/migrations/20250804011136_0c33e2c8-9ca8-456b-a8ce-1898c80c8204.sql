-- Fix security functions to properly block anonymous users

-- Drop existing functions and recreate with proper anonymous user blocking
DROP FUNCTION IF EXISTS public.is_authenticated_non_anon();
DROP FUNCTION IF EXISTS public.get_current_user_id_optimized();  
DROP FUNCTION IF EXISTS public.is_user_superadmin_safe();
DROP FUNCTION IF EXISTS public.is_user_admin_in_company_safe();
DROP FUNCTION IF EXISTS public.get_user_company_ids_safe();

-- Create secure functions that properly block anonymous users
CREATE OR REPLACE FUNCTION public.is_authenticated_non_anon()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    auth.role() = 'authenticated' AND
    auth.uid() IS NOT NULL AND 
    COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false;
$$;

CREATE OR REPLACE FUNCTION public.get_current_user_id_optimized()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    CASE 
      WHEN auth.role() = 'authenticated' AND 
           auth.uid() IS NOT NULL AND 
           COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false
      THEN auth.uid()
      ELSE NULL
    END;
$$;

CREATE OR REPLACE FUNCTION public.is_user_superadmin_safe(user_id_param uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    CASE 
      WHEN auth.role() = 'authenticated' AND 
           auth.uid() IS NOT NULL AND 
           COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false AND
           user_id_param IS NOT NULL
      THEN EXISTS (
        SELECT 1 FROM user_company_roles 
        WHERE user_id = user_id_param 
        AND role = 'superadmin' 
        AND is_active = true
      )
      ELSE false
    END;
$$;

CREATE OR REPLACE FUNCTION public.is_user_admin_in_company_safe(user_id_param uuid, company_id_param uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    CASE 
      WHEN auth.role() = 'authenticated' AND 
           auth.uid() IS NOT NULL AND 
           COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false AND
           user_id_param IS NOT NULL AND 
           company_id_param IS NOT NULL
      THEN EXISTS (
        SELECT 1 FROM user_company_roles
        WHERE user_id = user_id_param
          AND company_id = company_id_param
          AND role IN ('company_owner', 'operations_manager', 'superadmin')
          AND is_active = true
      )
      ELSE false
    END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_company_ids_safe(user_id_param uuid)
RETURNS uuid[]
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    CASE 
      WHEN auth.role() = 'authenticated' AND 
           auth.uid() IS NOT NULL AND 
           COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false AND
           user_id_param IS NOT NULL
      THEN ARRAY(
        SELECT company_id 
        FROM user_company_roles 
        WHERE user_id = user_id_param AND is_active = true
      )
      ELSE ARRAY[]::uuid[]
    END;
$$;

-- Now update RLS policies to use more restrictive checks

-- Fix expense_recurring_templates policies
DROP POLICY IF EXISTS "expense_recurring_templates_select_final" ON public.expense_recurring_templates;
DROP POLICY IF EXISTS "expense_recurring_templates_insert_final" ON public.expense_recurring_templates;
DROP POLICY IF EXISTS "expense_recurring_templates_update_final" ON public.expense_recurring_templates;
DROP POLICY IF EXISTS "expense_recurring_templates_delete_final" ON public.expense_recurring_templates;

CREATE POLICY "expense_recurring_templates_select_final" ON public.expense_recurring_templates
FOR SELECT TO authenticated USING (
  is_authenticated_non_anon() AND 
  get_current_user_id_optimized() IS NOT NULL AND (
    user_id = get_current_user_id_optimized() 
    OR user_id IN (
      SELECT ucr.user_id
      FROM user_company_roles ucr
      WHERE ucr.company_id IN (
        SELECT ucr2.company_id
        FROM user_company_roles ucr2
        WHERE ucr2.user_id = get_current_user_id_optimized() AND ucr2.is_active = true
      ) AND ucr.is_active = true
    )
  )
);

CREATE POLICY "expense_recurring_templates_insert_final" ON public.expense_recurring_templates
FOR INSERT TO authenticated WITH CHECK (
  is_authenticated_non_anon() AND 
  get_current_user_id_optimized() IS NOT NULL AND (
    user_id IN (
      SELECT ucr.user_id
      FROM user_company_roles ucr
      WHERE ucr.company_id IN (
        SELECT ucr2.company_id
        FROM user_company_roles ucr2
        WHERE ucr2.user_id = get_current_user_id_optimized() 
        AND ucr2.is_active = true 
        AND ucr2.role = ANY(ARRAY['company_owner'::user_role, 'operations_manager'::user_role, 'superadmin'::user_role])
      ) AND ucr.is_active = true
    ) 
    OR is_user_superadmin_safe(get_current_user_id_optimized())
  )
);

CREATE POLICY "expense_recurring_templates_update_final" ON public.expense_recurring_templates
FOR UPDATE TO authenticated USING (
  is_authenticated_non_anon() AND 
  get_current_user_id_optimized() IS NOT NULL AND (
    user_id IN (
      SELECT ucr.user_id
      FROM user_company_roles ucr
      WHERE ucr.company_id IN (
        SELECT ucr2.company_id
        FROM user_company_roles ucr2
        WHERE ucr2.user_id = get_current_user_id_optimized() 
        AND ucr2.is_active = true 
        AND ucr2.role = ANY(ARRAY['company_owner'::user_role, 'operations_manager'::user_role, 'superadmin'::user_role])
      ) AND ucr.is_active = true
    ) 
    OR is_user_superadmin_safe(get_current_user_id_optimized())
  )
) WITH CHECK (
  is_authenticated_non_anon() AND 
  get_current_user_id_optimized() IS NOT NULL AND (
    user_id IN (
      SELECT ucr.user_id
      FROM user_company_roles ucr
      WHERE ucr.company_id IN (
        SELECT ucr2.company_id
        FROM user_company_roles ucr2
        WHERE ucr2.user_id = get_current_user_id_optimized() 
        AND ucr2.is_active = true 
        AND ucr2.role = ANY(ARRAY['company_owner'::user_role, 'operations_manager'::user_role, 'superadmin'::user_role])
      ) AND ucr.is_active = true
    ) 
    OR is_user_superadmin_safe(get_current_user_id_optimized())
  )
);

CREATE POLICY "expense_recurring_templates_delete_final" ON public.expense_recurring_templates
FOR DELETE TO authenticated USING (
  is_authenticated_non_anon() AND 
  get_current_user_id_optimized() IS NOT NULL AND (
    user_id IN (
      SELECT ucr.user_id
      FROM user_company_roles ucr
      WHERE ucr.company_id IN (
        SELECT ucr2.company_id
        FROM user_company_roles ucr2
        WHERE ucr2.user_id = get_current_user_id_optimized() 
        AND ucr2.is_active = true 
        AND ucr2.role = ANY(ARRAY['company_owner'::user_role, 'operations_manager'::user_role, 'superadmin'::user_role])
      ) AND ucr.is_active = true
    ) 
    OR is_user_superadmin_safe(get_current_user_id_optimized())
  )
);

-- Fix other_income policies
DROP POLICY IF EXISTS "other_income_select" ON public.other_income;
DROP POLICY IF EXISTS "other_income_insert" ON public.other_income;
DROP POLICY IF EXISTS "other_income_update" ON public.other_income;
DROP POLICY IF EXISTS "other_income_delete" ON public.other_income;

CREATE POLICY "other_income_select" ON public.other_income
FOR SELECT TO authenticated USING (
  is_authenticated_non_anon() AND 
  get_current_user_id_optimized() IS NOT NULL AND (
    user_id = get_current_user_id_optimized() 
    OR payment_period_id IN (
      SELECT dpc.id
      FROM driver_period_calculations dpc
      JOIN company_payment_periods cpp ON dpc.company_payment_period_id = cpp.id
      JOIN user_company_roles ucr ON cpp.company_id = ucr.company_id
      WHERE ucr.user_id = get_current_user_id_optimized() AND ucr.is_active = true
    )
  )
);

CREATE POLICY "other_income_insert" ON public.other_income
FOR INSERT TO authenticated WITH CHECK (
  is_authenticated_non_anon() AND 
  get_current_user_id_optimized() IS NOT NULL AND (
    user_id IN (
      SELECT ucr.user_id
      FROM user_company_roles ucr
      WHERE ucr.company_id IN (
        SELECT ucr2.company_id
        FROM user_company_roles ucr2
        WHERE ucr2.user_id = get_current_user_id_optimized() AND ucr2.is_active = true
      ) AND ucr.is_active = true
    )
  )
);

CREATE POLICY "other_income_update" ON public.other_income
FOR UPDATE TO authenticated USING (
  is_authenticated_non_anon() AND 
  get_current_user_id_optimized() IS NOT NULL AND (
    payment_period_id IN (
      SELECT dpc.id
      FROM driver_period_calculations dpc
      JOIN company_payment_periods cpp ON dpc.company_payment_period_id = cpp.id
      JOIN user_company_roles ucr ON cpp.company_id = ucr.company_id
      WHERE ucr.user_id = get_current_user_id_optimized() 
      AND ucr.is_active = true 
      AND NOT cpp.is_locked
    )
  )
) WITH CHECK (
  is_authenticated_non_anon() AND 
  get_current_user_id_optimized() IS NOT NULL AND (
    user_id IN (
      SELECT ucr.user_id
      FROM user_company_roles ucr
      WHERE ucr.company_id IN (
        SELECT ucr2.company_id
        FROM user_company_roles ucr2
        WHERE ucr2.user_id = get_current_user_id_optimized() AND ucr2.is_active = true
      ) AND ucr.is_active = true
    )
  )
);

CREATE POLICY "other_income_delete" ON public.other_income
FOR DELETE TO authenticated USING (
  is_authenticated_non_anon() AND 
  get_current_user_id_optimized() IS NOT NULL AND (
    payment_period_id IN (
      SELECT dpc.id
      FROM driver_period_calculations dpc
      JOIN company_payment_periods cpp ON dpc.company_payment_period_id = cpp.id
      JOIN user_company_roles ucr ON cpp.company_id = ucr.company_id
      WHERE ucr.user_id = get_current_user_id_optimized() 
      AND ucr.is_active = true 
      AND NOT cpp.is_locked
    )
  )
);