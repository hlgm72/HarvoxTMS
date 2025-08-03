-- Drop dependent policies first
DROP POLICY IF EXISTS "recurring_expense_templates_insert" ON public.recurring_expense_templates;
DROP POLICY IF EXISTS "recurring_expense_templates_select" ON public.recurring_expense_templates;
DROP POLICY IF EXISTS "recurring_expense_templates_update" ON public.recurring_expense_templates;
DROP POLICY IF EXISTS "recurring_expense_templates_delete" ON public.recurring_expense_templates;

-- Create new enum with the 6 roles we want
CREATE TYPE user_role_new AS ENUM (
  'superadmin',
  'company_owner', 
  'company_admin',
  'dispatcher',
  'driver',
  'multi_company_dispatcher'
);

-- Update the user_company_roles table to use the new enum
ALTER TABLE user_company_roles 
ALTER COLUMN role TYPE user_role_new USING role::text::user_role_new;

-- Drop the old enum and rename the new one
DROP TYPE user_role;
ALTER TYPE user_role_new RENAME TO user_role;

-- Recreate the policies for recurring_expense_templates if they exist
CREATE POLICY "recurring_expense_templates_insert" ON public.recurring_expense_templates
FOR INSERT WITH CHECK (
  require_authenticated_user() AND
  driver_user_id IN (
    SELECT ucr.user_id
    FROM user_company_roles ucr
    WHERE ucr.company_id IN (
      SELECT ucr2.company_id
      FROM user_company_roles ucr2
      WHERE ucr2.user_id = auth.uid() AND ucr2.is_active = true
    ) AND ucr.is_active = true
  )
);

CREATE POLICY "recurring_expense_templates_select" ON public.recurring_expense_templates
FOR SELECT USING (
  require_authenticated_user() AND
  driver_user_id IN (
    SELECT ucr.user_id
    FROM user_company_roles ucr
    WHERE ucr.company_id IN (
      SELECT ucr2.company_id
      FROM user_company_roles ucr2
      WHERE ucr2.user_id = auth.uid() AND ucr2.is_active = true
    ) AND ucr.is_active = true
  )
);

CREATE POLICY "recurring_expense_templates_update" ON public.recurring_expense_templates
FOR UPDATE USING (
  require_authenticated_user() AND
  driver_user_id IN (
    SELECT ucr.user_id
    FROM user_company_roles ucr
    WHERE ucr.company_id IN (
      SELECT ucr2.company_id
      FROM user_company_roles ucr2
      WHERE ucr2.user_id = auth.uid() AND ucr2.is_active = true
    ) AND ucr.is_active = true
  )
);

CREATE POLICY "recurring_expense_templates_delete" ON public.recurring_expense_templates
FOR DELETE USING (
  require_authenticated_user() AND
  driver_user_id IN (
    SELECT ucr.user_id
    FROM user_company_roles ucr
    WHERE ucr.company_id IN (
      SELECT ucr2.company_id
      FROM user_company_roles ucr2
      WHERE ucr2.user_id = auth.uid() AND ucr2.is_active = true
    ) AND ucr.is_active = true
  )
);