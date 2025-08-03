-- First, temporarily drop policies that reference the role column directly
DROP POLICY IF EXISTS "Users can insert expense_instances for their company" ON expense_instances;
DROP POLICY IF EXISTS "Users can update expense_instances for their company" ON expense_instances;
DROP POLICY IF EXISTS "Users can delete expense_instances for their company" ON expense_instances;

-- Update user_role enum to match the new role structure
ALTER TYPE user_role RENAME TO user_role_old;

CREATE TYPE user_role AS ENUM (
    'superadmin',
    'company_owner', 
    'company_admin',
    'dispatcher',
    'driver',
    'multi_company_dispatcher'
);

-- Update existing tables to use the new enum
ALTER TABLE user_company_roles 
ALTER COLUMN role TYPE user_role USING 
CASE 
    WHEN role::text = 'general_manager' THEN 'company_admin'::user_role
    WHEN role::text = 'operations_manager' THEN 'company_admin'::user_role
    WHEN role::text = 'safety_manager' THEN 'company_admin'::user_role
    WHEN role::text = 'senior_dispatcher' THEN 'dispatcher'::user_role
    ELSE role::text::user_role
END;

-- Drop the old enum
DROP TYPE user_role_old;

-- Recreate the expense_instances policies with updated roles
CREATE POLICY "Users can insert expense_instances for their company" ON expense_instances
FOR INSERT
WITH CHECK (
  payment_period_id IN (
    SELECT dpc.id
    FROM driver_period_calculations dpc
    JOIN company_payment_periods cpp ON dpc.company_payment_period_id = cpp.id
    JOIN user_company_roles ucr ON cpp.company_id = ucr.company_id
    WHERE ucr.user_id = auth.uid()
    AND ucr.is_active = true
    AND ucr.role IN ('company_owner', 'company_admin', 'dispatcher')
  )
);

CREATE POLICY "Users can update expense_instances for their company" ON expense_instances
FOR UPDATE
USING (
  require_authenticated_user() AND
  payment_period_id IN (
    SELECT dpc.id
    FROM driver_period_calculations dpc
    JOIN company_payment_periods cpp ON dpc.company_payment_period_id = cpp.id
    JOIN user_company_roles ucr ON cpp.company_id = ucr.company_id
    WHERE ucr.user_id = auth.uid()
    AND ucr.is_active = true
    AND ucr.role IN ('company_owner', 'company_admin', 'dispatcher')
  )
)
WITH CHECK (
  require_authenticated_user() AND
  payment_period_id IN (
    SELECT dpc.id
    FROM driver_period_calculations dpc
    JOIN company_payment_periods cpp ON dpc.company_payment_period_id = cpp.id
    JOIN user_company_roles ucr ON cpp.company_id = ucr.company_id
    WHERE ucr.user_id = auth.uid()
    AND ucr.is_active = true
    AND ucr.role IN ('company_owner', 'company_admin', 'dispatcher')
  )
);

CREATE POLICY "Users can delete expense_instances for their company" ON expense_instances
FOR DELETE
USING (
  require_authenticated_user() AND
  payment_period_id IN (
    SELECT dpc.id
    FROM driver_period_calculations dpc
    JOIN company_payment_periods cpp ON dpc.company_payment_period_id = cpp.id
    JOIN user_company_roles ucr ON cpp.company_id = ucr.company_id
    WHERE ucr.user_id = auth.uid()
    AND ucr.is_active = true
    AND ucr.role IN ('company_owner', 'company_admin', 'dispatcher')
  )
);