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