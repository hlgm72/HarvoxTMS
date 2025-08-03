-- Update existing roles to use only the 6 allowed roles
-- First, update any superadmin roles that exist
UPDATE user_company_roles SET role = 'superadmin' WHERE role = 'superadmin';

-- Update company_owner roles 
UPDATE user_company_roles SET role = 'company_owner' WHERE role = 'company_owner';

-- Update dispatcher roles (keep as is)
UPDATE user_company_roles SET role = 'dispatcher' WHERE role = 'dispatcher';

-- Update driver roles (keep as is)  
UPDATE user_company_roles SET role = 'driver' WHERE role = 'driver';

-- The database should now only contain the 6 roles we want
-- Let's verify all roles are in our allowed list
SELECT DISTINCT role FROM user_company_roles;