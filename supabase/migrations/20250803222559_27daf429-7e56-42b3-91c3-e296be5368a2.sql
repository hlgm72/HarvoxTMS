-- Create the new enum with only the 6 roles
CREATE TYPE user_role AS ENUM (
  'superadmin',
  'company_owner', 
  'company_admin',
  'dispatcher',
  'driver',
  'multi_company_dispatcher'
);

-- Re-add the role column to user_company_roles
ALTER TABLE user_company_roles ADD COLUMN role user_role NOT NULL DEFAULT 'driver';

-- Re-add the role column to user_invitations  
ALTER TABLE user_invitations ADD COLUMN role user_role NOT NULL DEFAULT 'driver';

-- Update existing data with default values (all users become drivers for now)
UPDATE user_company_roles SET role = 'driver' WHERE role IS NULL;
UPDATE user_invitations SET role = 'driver' WHERE role IS NULL;

-- Recreate has_role function
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role user_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_company_roles
    WHERE user_id = _user_id
      AND role = _role
      AND is_active = true
  );
$$;

-- Recreate essential policies for user_company_roles
CREATE POLICY "user_company_roles_select" ON public.user_company_roles
FOR SELECT USING (
  auth.uid() IS NOT NULL AND
  COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false AND
  (user_id = auth.uid() OR 
   company_id IN (
     SELECT company_id FROM user_company_roles 
     WHERE user_id = auth.uid() AND is_active = true
   ))
);

CREATE POLICY "user_company_roles_insert" ON public.user_company_roles
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL AND
  COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false
);

CREATE POLICY "user_company_roles_update" ON public.user_company_roles
FOR UPDATE USING (
  auth.uid() IS NOT NULL AND
  COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false
);

CREATE POLICY "user_company_roles_delete" ON public.user_company_roles
FOR DELETE USING (
  auth.uid() IS NOT NULL AND
  COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false
);