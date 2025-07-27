-- Final security fixes for remaining policies

-- 29. Fix pending_expenses
DROP POLICY IF EXISTS "Pending expenses comprehensive policy" ON public.pending_expenses;
CREATE POLICY "Pending expenses comprehensive policy" ON public.pending_expenses
FOR ALL 
TO authenticated
USING (
  require_authenticated_user() AND (
    auth.uid() = driver_user_id OR
    driver_user_id IN (
      SELECT ucr.user_id FROM user_company_roles ucr
      WHERE ucr.company_id IN (
        SELECT ucr2.company_id FROM user_company_roles ucr2
        WHERE ucr2.user_id = auth.uid() AND ucr2.is_active = true
      ) AND ucr.is_active = true
    )
  )
)
WITH CHECK (
  require_authenticated_user() AND
  driver_user_id IN (
    SELECT ucr.user_id FROM user_company_roles ucr
    WHERE ucr.company_id IN (
      SELECT ucr2.company_id FROM user_company_roles ucr2
      WHERE ucr2.user_id = auth.uid() AND ucr2.is_active = true
    ) AND ucr.is_active = true
  )
);

-- 30. Fix profiles
DROP POLICY IF EXISTS "Profiles admin and user access" ON public.profiles;
CREATE POLICY "Profiles admin and user access" ON public.profiles
FOR ALL 
TO authenticated
USING (
  require_authenticated_user() AND (
    auth.uid() = id OR
    EXISTS (
      SELECT 1 FROM user_company_roles ucr
      WHERE ucr.user_id = auth.uid()
      AND ucr.role = 'superadmin'
      AND ucr.is_active = true
    )
  )
)
WITH CHECK (
  require_authenticated_user() AND
  auth.uid() = id
);

-- 31. Fix recurring_expense_templates policies
DROP POLICY IF EXISTS "recurring_expense_templates_select_policy" ON public.recurring_expense_templates;
CREATE POLICY "recurring_expense_templates_select_policy" ON public.recurring_expense_templates
FOR SELECT 
TO authenticated
USING (
  require_authenticated_user() AND (
    auth.uid() = driver_user_id OR
    driver_user_id IN (
      SELECT ucr.user_id FROM user_company_roles ucr
      WHERE ucr.company_id IN (
        SELECT ucr2.company_id FROM user_company_roles ucr2
        WHERE ucr2.user_id = auth.uid() AND ucr2.is_active = true
      ) AND ucr.is_active = true
    )
  )
);

DROP POLICY IF EXISTS "recurring_expense_templates_update_policy" ON public.recurring_expense_templates;
CREATE POLICY "recurring_expense_templates_update_policy" ON public.recurring_expense_templates
FOR UPDATE 
TO authenticated
USING (
  require_authenticated_user() AND
  driver_user_id IN (
    SELECT ucr.user_id FROM user_company_roles ucr
    WHERE ucr.company_id IN (
      SELECT ucr2.company_id FROM user_company_roles ucr2
      WHERE ucr2.user_id = auth.uid() AND ucr2.is_active = true
    ) AND ucr.is_active = true
  )
)
WITH CHECK (
  require_authenticated_user() AND
  driver_user_id IN (
    SELECT ucr.user_id FROM user_company_roles ucr
    WHERE ucr.company_id IN (
      SELECT ucr2.company_id FROM user_company_roles ucr2
      WHERE ucr2.user_id = auth.uid() AND ucr2.is_active = true
    ) AND ucr.is_active = true
  )
);

DROP POLICY IF EXISTS "recurring_expense_templates_delete_policy" ON public.recurring_expense_templates;
CREATE POLICY "recurring_expense_templates_delete_policy" ON public.recurring_expense_templates
FOR DELETE 
TO authenticated
USING (
  require_authenticated_user() AND
  driver_user_id IN (
    SELECT ucr.user_id FROM user_company_roles ucr
    WHERE ucr.company_id IN (
      SELECT ucr2.company_id FROM user_company_roles ucr2
      WHERE ucr2.user_id = auth.uid() AND ucr2.is_active = true
    ) AND ucr.is_active = true
  )
);

-- 32. Fix security_audit_log (superadmin only)
DROP POLICY IF EXISTS "Superadmins can view audit logs" ON public.security_audit_log;
CREATE POLICY "Superadmins can view audit logs" ON public.security_audit_log
FOR SELECT 
TO authenticated
USING (
  require_authenticated_user() AND
  EXISTS (
    SELECT 1 FROM user_company_roles ucr
    WHERE ucr.user_id = auth.uid()
    AND ucr.role = 'superadmin'
    AND ucr.is_active = true
  )
);

-- 33. Fix user_company_roles
DROP POLICY IF EXISTS "Optimized role management policy" ON public.user_company_roles;
CREATE POLICY "Optimized role management policy" ON public.user_company_roles
FOR ALL 
TO authenticated
USING (
  require_authenticated_user() AND (
    auth.uid() = user_id OR
    company_id IN (
      SELECT ucr.company_id FROM user_company_roles ucr
      WHERE ucr.user_id = auth.uid() AND ucr.is_active = true
    )
  )
)
WITH CHECK (
  require_authenticated_user() AND (
    auth.uid() = user_id OR
    company_id IN (
      SELECT ucr.company_id FROM user_company_roles ucr
      WHERE ucr.user_id = auth.uid() 
      AND ucr.role = ANY (ARRAY['company_owner'::user_role, 'superadmin'::user_role])
      AND ucr.is_active = true
    )
  )
);

-- 34. Fix user_invitations
DROP POLICY IF EXISTS "User invitations unified access" ON public.user_invitations;
CREATE POLICY "User invitations unified access" ON public.user_invitations
FOR ALL 
TO authenticated
USING (
  require_authenticated_user() AND
  company_id IN (
    SELECT ucr.company_id FROM user_company_roles ucr
    WHERE ucr.user_id = auth.uid() AND ucr.is_active = true
  )
)
WITH CHECK (
  require_authenticated_user() AND
  company_id IN (
    SELECT ucr.company_id FROM user_company_roles ucr
    WHERE ucr.user_id = auth.uid() AND ucr.is_active = true
  )
);

-- Add missing insert policy for maintenance_types
CREATE POLICY "Service role can insert maintenance types" ON public.maintenance_types
FOR INSERT 
TO service_role
USING (true)
WITH CHECK (true);

-- Add missing policies for expense_instances insert
CREATE POLICY "Users can insert expense_instances for their company" ON public.expense_instances
FOR INSERT 
TO authenticated
WITH CHECK (
  require_authenticated_user() AND
  payment_period_id IN (
    SELECT dpc.id FROM driver_period_calculations dpc
    JOIN company_payment_periods cpp ON dpc.company_payment_period_id = cpp.id
    JOIN user_company_roles ucr ON cpp.company_id = ucr.company_id
    WHERE ucr.user_id = auth.uid() 
    AND ucr.is_active = true 
    AND ucr.role = ANY (ARRAY['company_owner'::user_role, 'dispatcher'::user_role, 'operations_manager'::user_role])
  )
);

-- Add missing insert policy for fuel_card_providers
CREATE POLICY "Company managers can insert fuel card providers" ON public.fuel_card_providers
FOR INSERT 
TO authenticated
WITH CHECK (
  require_authenticated_user() AND
  EXISTS (
    SELECT 1 FROM user_company_roles ucr
    WHERE ucr.user_id = auth.uid()
    AND ucr.role = ANY (ARRAY['company_owner'::user_role, 'operations_manager'::user_role, 'superadmin'::user_role])
    AND ucr.is_active = true
  )
);