-- Create a temporary approach: First, create the new enum with a different name
CREATE TYPE user_role_new AS ENUM (
    'superadmin',
    'company_owner', 
    'company_admin',
    'dispatcher',
    'driver',
    'multi_company_dispatcher'
);

-- Add a new column with the new enum type
ALTER TABLE user_company_roles ADD COLUMN role_new user_role_new;

-- Update the new column with mapped values
UPDATE user_company_roles SET role_new = 
CASE 
    WHEN role::text = 'general_manager' THEN 'company_admin'::user_role_new
    WHEN role::text = 'operations_manager' THEN 'company_admin'::user_role_new
    WHEN role::text = 'safety_manager' THEN 'company_admin'::user_role_new
    WHEN role::text = 'senior_dispatcher' THEN 'dispatcher'::user_role_new
    ELSE role::text::user_role_new
END;

-- Make the new column non-nullable
ALTER TABLE user_company_roles ALTER COLUMN role_new SET NOT NULL;

-- Drop the old column and enum
ALTER TABLE user_company_roles DROP COLUMN role;
DROP TYPE user_role;

-- Rename the new enum and column
ALTER TYPE user_role_new RENAME TO user_role;
ALTER TABLE user_company_roles RENAME COLUMN role_new TO role;