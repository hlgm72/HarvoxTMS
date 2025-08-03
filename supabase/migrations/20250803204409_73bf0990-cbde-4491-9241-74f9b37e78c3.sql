-- First, drop all functions that depend on user_role enum
DROP FUNCTION IF EXISTS public.has_role(uuid, user_role);
DROP FUNCTION IF EXISTS public.get_user_company_roles(uuid);
DROP FUNCTION IF EXISTS public.validate_invitation_token(text);
DROP FUNCTION IF EXISTS public.user_has_role_in_company(uuid, uuid, user_role);

-- Drop the user_invitations table temporarily (if it exists)
DROP TABLE IF EXISTS public.user_invitations CASCADE;

-- Now we can safely update the enum
-- Drop all RLS policies first
ALTER TABLE public.user_company_roles DISABLE ROW LEVEL SECURITY;

-- Create new enum with ALL corrected values including superadmin
CREATE TYPE public.user_role_new AS ENUM (
    'superadmin',
    'company_owner',
    'operations_manager',
    'senior_dispatcher', 
    'dispatcher',
    'driver'
);

-- Add new column with new enum type
ALTER TABLE public.user_company_roles 
ADD COLUMN role_new public.user_role_new;

-- Map existing values to new enum values
UPDATE public.user_company_roles 
SET role_new = CASE 
    WHEN role::text = 'superadmin' THEN 'superadmin'::public.user_role_new
    WHEN role::text = 'company_owner' THEN 'company_owner'::public.user_role_new
    WHEN role::text = 'operations_manager' THEN 'operations_manager'::public.user_role_new
    WHEN role::text = 'senior_dispatcher' THEN 'senior_dispatcher'::public.user_role_new
    WHEN role::text = 'dispatcher' THEN 'dispatcher'::public.user_role_new
    WHEN role::text = 'driver' THEN 'driver'::public.user_role_new
    ELSE 'driver'::public.user_role_new -- default fallback
END;

-- Make the new column NOT NULL
ALTER TABLE public.user_company_roles 
ALTER COLUMN role_new SET NOT NULL;

-- Drop the old column and enum
ALTER TABLE public.user_company_roles 
DROP COLUMN role;

DROP TYPE public.user_role CASCADE;

-- Rename the new enum and column
ALTER TYPE public.user_role_new RENAME TO user_role;
ALTER TABLE public.user_company_roles 
RENAME COLUMN role_new TO role;

-- Recreate the has_role function
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

-- Recreate user_has_role_in_company function
CREATE OR REPLACE FUNCTION public.user_has_role_in_company(user_id_param uuid, company_id_param uuid, role_param user_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_company_roles
    WHERE user_id = user_id_param
      AND company_id = company_id_param
      AND role = role_param
      AND is_active = true
  );
$$;

-- Re-enable RLS and create policies
ALTER TABLE public.user_company_roles ENABLE ROW LEVEL SECURITY;

-- Recreate essential RLS policies
CREATE POLICY "Users can view roles in their companies" 
ON public.user_company_roles 
FOR SELECT 
USING (
  company_id IN (
    SELECT ucr.company_id 
    FROM public.user_company_roles ucr 
    WHERE ucr.user_id = auth.uid() AND ucr.is_active = true
  )
);

CREATE POLICY "Company admins can manage user roles" 
ON public.user_company_roles 
FOR ALL 
USING (
  -- Current user is admin in the same company
  company_id IN (
    SELECT ucr.company_id 
    FROM public.user_company_roles ucr 
    WHERE ucr.user_id = auth.uid() 
    AND ucr.role IN ('company_owner', 'operations_manager') 
    AND ucr.is_active = true
  )
  OR 
  -- Current user is superadmin
  EXISTS (
    SELECT 1 FROM public.user_company_roles ucr 
    WHERE ucr.user_id = auth.uid() 
    AND ucr.role = 'superadmin' 
    AND ucr.is_active = true
  )
)
WITH CHECK (
  company_id IN (
    SELECT ucr.company_id 
    FROM public.user_company_roles ucr 
    WHERE ucr.user_id = auth.uid() 
    AND ucr.role IN ('company_owner', 'operations_manager') 
    AND ucr.is_active = true
  )
  OR 
  EXISTS (
    SELECT 1 FROM public.user_company_roles ucr 
    WHERE ucr.user_id = auth.uid() 
    AND ucr.role = 'superadmin' 
    AND ucr.is_active = true
  )
);