-- Comprehensive security linter fixes - Absolute Final Part
-- Fix the remaining critical tables

-- 26. Fix owner_operators
DROP POLICY IF EXISTS "Owner operators complete policy" ON public.owner_operators;
CREATE POLICY "Owner operators complete policy" ON public.owner_operators
FOR ALL 
TO authenticated
USING (
  require_authenticated_user() AND (
    auth.uid() = user_id OR
    user_id IN (
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
  auth.uid() = user_id
);

-- 27. Fix payment_methods
DROP POLICY IF EXISTS "Payment methods comprehensive policy" ON public.payment_methods;
CREATE POLICY "Payment methods comprehensive policy" ON public.payment_methods
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

-- 28. Fix payment_reports policies
DROP POLICY IF EXISTS "Users can view payment reports for their company periods" ON public.payment_reports;
CREATE POLICY "Users can view payment reports for their company periods" ON public.payment_reports
FOR SELECT 
TO authenticated
USING (
  require_authenticated_user() AND
  payment_period_id IN (
    SELECT pp.id FROM payment_periods pp
    JOIN user_company_roles ucr ON pp.driver_user_id = ucr.user_id
    WHERE ucr.company_id IN (
      SELECT ucr2.company_id FROM user_company_roles ucr2
      WHERE ucr2.user_id = auth.uid() AND ucr2.is_active = true
    ) AND ucr.is_active = true
  )
);

DROP POLICY IF EXISTS "Company owners can update payment reports" ON public.payment_reports;
CREATE POLICY "Company owners can update payment reports" ON public.payment_reports
FOR UPDATE 
TO authenticated
USING (
  require_authenticated_user() AND
  payment_period_id IN (
    SELECT pp.id FROM payment_periods pp
    JOIN user_company_roles ucr ON pp.driver_user_id = ucr.user_id
    WHERE ucr.company_id IN (
      SELECT ucr2.company_id FROM user_company_roles ucr2
      WHERE ucr2.user_id = auth.uid() 
      AND ucr2.role = 'company_owner' 
      AND ucr2.is_active = true
    ) AND ucr.is_active = true
  )
)
WITH CHECK (
  require_authenticated_user() AND
  payment_period_id IN (
    SELECT pp.id FROM payment_periods pp
    JOIN user_company_roles ucr ON pp.driver_user_id = ucr.user_id
    WHERE ucr.company_id IN (
      SELECT ucr2.company_id FROM user_company_roles ucr2
      WHERE ucr2.user_id = auth.uid() 
      AND ucr2.role = 'company_owner' 
      AND ucr2.is_active = true
    ) AND ucr.is_active = true
  )
);

DROP POLICY IF EXISTS "Company owners can delete payment reports" ON public.payment_reports;
CREATE POLICY "Company owners can delete payment reports" ON public.payment_reports
FOR DELETE 
TO authenticated
USING (
  require_authenticated_user() AND
  payment_period_id IN (
    SELECT pp.id FROM payment_periods pp
    JOIN user_company_roles ucr ON pp.driver_user_id = ucr.user_id
    WHERE ucr.company_id IN (
      SELECT ucr2.company_id FROM user_company_roles ucr2
      WHERE ucr2.user_id = auth.uid() 
      AND ucr2.role = 'company_owner' 
      AND ucr2.is_active = true
    ) AND ucr.is_active = true
  )
);

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

-- Note: Public reference data tables (us_cities, us_counties, us_states, zip_codes, etc.) 
-- intentionally allow public access as they contain geographic reference data
-- Storage policies and cron tables cannot be modified and are expected to show warnings