-- Fix infinite recursion in user_company_roles RLS policy
-- The issue is that the policy queries the same table it's protecting

-- First, create a security definer function to get user company roles without triggering RLS
CREATE OR REPLACE FUNCTION public.get_user_company_roles(user_id_param uuid)
RETURNS TABLE(company_id uuid, role user_role)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT ucr.company_id, ucr.role
  FROM public.user_company_roles ucr
  WHERE ucr.user_id = user_id_param 
  AND ucr.is_active = true;
$$;

-- Drop the problematic policy
DROP POLICY IF EXISTS "User company roles unified policy" ON public.user_company_roles;

-- Create a simpler, non-recursive policy for user_company_roles
CREATE POLICY "User company roles safe policy" ON public.user_company_roles
FOR ALL
USING (
  (SELECT auth.role()) = 'service_role'
  OR ((SELECT auth.role()) = 'authenticated' AND (
    is_superadmin((SELECT auth.uid()))
    OR (SELECT auth.uid()) = user_id
  ))
)
WITH CHECK (
  (SELECT auth.role()) = 'service_role'
  OR ((SELECT auth.role()) = 'authenticated' AND (
    is_superadmin((SELECT auth.uid()))
    OR (SELECT auth.uid()) = user_id
  ))
);

-- Now update other policies that were referencing user_company_roles to use the new function
-- Update companies policy
DROP POLICY IF EXISTS "Companies unified access policy" ON public.companies;
CREATE POLICY "Companies unified access policy" ON public.companies
FOR ALL
USING (
  is_superadmin((SELECT auth.uid())) 
  OR (id IN (
    SELECT company_id FROM public.get_user_company_roles((SELECT auth.uid()))
  ))
)
WITH CHECK (is_superadmin((SELECT auth.uid())));

-- Update fuel expenses policy
DROP POLICY IF EXISTS "Fuel expenses complete policy" ON public.fuel_expenses;
CREATE POLICY "Fuel expenses complete policy" ON public.fuel_expenses
FOR ALL
USING (
  (SELECT auth.role()) = 'service_role'
  OR ((SELECT auth.role()) = 'authenticated' AND (
    (SELECT auth.uid()) = driver_user_id
    OR ((NOT is_superadmin((SELECT auth.uid()))) AND driver_user_id IN (
      SELECT ucr.user_id
      FROM user_company_roles ucr
      WHERE ucr.company_id IN (
        SELECT company_id FROM public.get_user_company_roles((SELECT auth.uid()))
      ) AND ucr.is_active = true
    ))
  ))
)
WITH CHECK (
  (SELECT auth.role()) = 'service_role'
  OR ((SELECT auth.role()) = 'authenticated' AND driver_user_id IN (
    SELECT ucr.user_id
    FROM user_company_roles ucr
    WHERE ucr.company_id IN (
      SELECT company_id FROM public.get_user_company_roles((SELECT auth.uid()))
    ) AND ucr.is_active = true
  ) AND NOT is_period_locked(payment_period_id))
);

-- Update fuel limits policy
DROP POLICY IF EXISTS "Fuel limits complete policy" ON public.fuel_limits;
CREATE POLICY "Fuel limits complete policy" ON public.fuel_limits
FOR ALL
USING (
  (SELECT auth.role()) = 'service_role'
  OR ((SELECT auth.role()) = 'authenticated' AND (
    (SELECT auth.uid()) = driver_user_id
    OR driver_user_id IN (
      SELECT ucr.user_id
      FROM user_company_roles ucr
      WHERE ucr.company_id IN (
        SELECT company_id FROM public.get_user_company_roles((SELECT auth.uid()))
      ) AND ucr.is_active = true
    )
  ))
)
WITH CHECK (
  (SELECT auth.role()) = 'service_role'
  OR ((SELECT auth.role()) = 'authenticated' AND driver_user_id IN (
    SELECT ucr.user_id
    FROM user_company_roles ucr
    WHERE ucr.company_id IN (
      SELECT company_id FROM public.get_user_company_roles((SELECT auth.uid()))
    ) AND ucr.is_active = true
  ))
);

-- Update expense instances policy
DROP POLICY IF EXISTS "Expense instances complete policy" ON public.expense_instances;
CREATE POLICY "Expense instances complete policy" ON public.expense_instances
FOR ALL
USING (
  (SELECT auth.role()) = 'service_role'
  OR ((SELECT auth.role()) = 'authenticated' AND payment_period_id IN (
    SELECT pp.id
    FROM payment_periods pp
    JOIN user_company_roles ucr ON pp.driver_user_id = ucr.user_id
    WHERE ucr.company_id IN (
      SELECT company_id FROM public.get_user_company_roles((SELECT auth.uid()))
    ) AND ucr.is_active = true
  ))
)
WITH CHECK (
  (SELECT auth.role()) = 'service_role'
  OR ((SELECT auth.role()) = 'authenticated' AND payment_period_id IN (
    SELECT pp.id
    FROM payment_periods pp
    JOIN user_company_roles ucr ON pp.driver_user_id = ucr.user_id
    WHERE ucr.company_id IN (
      SELECT company_id FROM public.get_user_company_roles((SELECT auth.uid()))
    ) AND ucr.is_active = true
  ) AND NOT is_period_locked(payment_period_id))
);

-- Update expense template history policy
DROP POLICY IF EXISTS "Expense template history complete policy" ON public.expense_template_history;
CREATE POLICY "Expense template history complete policy" ON public.expense_template_history
FOR ALL
USING (
  (SELECT auth.role()) = 'service_role'
  OR ((SELECT auth.role()) = 'authenticated' AND template_id IN (
    SELECT ret.id
    FROM recurring_expense_templates ret
    JOIN user_company_roles ucr ON ret.driver_user_id = ucr.user_id
    WHERE ucr.company_id IN (
      SELECT company_id FROM public.get_user_company_roles((SELECT auth.uid()))
    ) AND ucr.is_active = true
  ))
)
WITH CHECK (
  (SELECT auth.role()) = 'service_role'
  OR ((SELECT auth.role()) = 'authenticated' AND template_id IN (
    SELECT ret.id
    FROM recurring_expense_templates ret
    JOIN user_company_roles ucr ON ret.driver_user_id = ucr.user_id
    WHERE ucr.company_id IN (
      SELECT company_id FROM public.get_user_company_roles((SELECT auth.uid()))
    ) AND ucr.is_active = true
  ))
);

-- Update recurring expense templates policy
DROP POLICY IF EXISTS "Recurring expense templates complete policy" ON public.recurring_expense_templates;
CREATE POLICY "Recurring expense templates complete policy" ON public.recurring_expense_templates
FOR ALL
USING (
  (SELECT auth.role()) = 'service_role'
  OR ((SELECT auth.role()) = 'authenticated' AND driver_user_id IN (
    SELECT ucr.user_id
    FROM user_company_roles ucr
    WHERE ucr.company_id IN (
      SELECT company_id FROM public.get_user_company_roles((SELECT auth.uid()))
    ) AND ucr.is_active = true
  ))
)
WITH CHECK (
  (SELECT auth.role()) = 'service_role'
  OR ((SELECT auth.role()) = 'authenticated' AND driver_user_id IN (
    SELECT ucr.user_id
    FROM user_company_roles ucr
    WHERE ucr.company_id IN (
      SELECT company_id FROM public.get_user_company_roles((SELECT auth.uid()))
    ) AND ucr.is_active = true
  ))
);

-- Update user invitations policy
DROP POLICY IF EXISTS "User invitations complete access" ON public.user_invitations;
CREATE POLICY "User invitations complete access" ON public.user_invitations
FOR ALL
USING (
  (SELECT auth.role()) = 'service_role'
  OR ((SELECT auth.role()) = 'authenticated' AND (
    is_superadmin((SELECT auth.uid()))
    OR email = (SELECT email FROM auth.users WHERE id = (SELECT auth.uid()))
    OR company_id IN (
      SELECT company_id FROM public.get_user_company_roles((SELECT auth.uid()))
      WHERE role IN ('company_owner', 'senior_dispatcher')
    )
  ))
)
WITH CHECK (
  (SELECT auth.role()) = 'service_role'
  OR ((SELECT auth.role()) = 'authenticated' AND (
    is_superadmin((SELECT auth.uid()))
    OR company_id IN (
      SELECT company_id FROM public.get_user_company_roles((SELECT auth.uid()))
      WHERE role IN ('company_owner', 'senior_dispatcher')
    )
  ))
);

-- Log the fix
INSERT INTO public.system_stats (stat_type, stat_value)
VALUES ('rls_infinite_recursion_fix', jsonb_build_object(
  'timestamp', now(),
  'description', 'Fixed infinite recursion in user_company_roles RLS policy',
  'solution', 'Created security definer function to avoid recursive policy queries',
  'function_created', 'get_user_company_roles'
));