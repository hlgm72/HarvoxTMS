-- Update the user_role enum to only include the 6 roles we want to keep
-- First, we need to handle any existing roles that will be removed

-- Update any users with removed roles to company_admin (as a fallback)
UPDATE user_company_roles 
SET role = 'company_admin' 
WHERE role IN ('operations_manager', 'general_manager', 'safety_manager', 'senior_dispatcher')
AND is_active = true;

-- Now update the enum type by dropping and recreating it
-- First save the old enum
ALTER TYPE user_role RENAME TO user_role_old;

-- Create the new enum with only the 6 roles we want
CREATE TYPE user_role AS ENUM (
  'superadmin',
  'company_owner', 
  'company_admin',
  'dispatcher',
  'driver',
  'multi_company_dispatcher'
);

-- Update the column to use the new enum
ALTER TABLE user_company_roles 
ALTER COLUMN role TYPE user_role USING role::text::user_role;

-- Update any other tables that use this enum
ALTER TABLE dispatcher_other_income
ALTER COLUMN income_type TYPE text;

-- Drop the old enum
DROP TYPE user_role_old;