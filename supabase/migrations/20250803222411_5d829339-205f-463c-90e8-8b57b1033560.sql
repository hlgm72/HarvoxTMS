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