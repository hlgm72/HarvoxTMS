-- Drop all RLS policies that reference the user_role enum or role column
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_company_roles;
DROP POLICY IF EXISTS "Company owners can manage roles" ON public.user_company_roles;
DROP POLICY IF EXISTS "SuperAdmin can manage all roles" ON public.user_company_roles;
DROP POLICY IF EXISTS "Users can view roles in their company" ON public.user_company_roles;
DROP POLICY IF EXISTS "Company admins can manage user roles" ON public.user_company_roles;
DROP POLICY IF EXISTS "Users can view user roles in their companies" ON public.user_company_roles;

-- Drop any other policies that might reference the role column
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.user_company_roles;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.user_company_roles;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON public.user_company_roles;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON public.user_company_roles;

-- Disable RLS temporarily
ALTER TABLE public.user_company_roles DISABLE ROW LEVEL SECURITY;

-- Now proceed with the enum migration
-- Create new enum with corrected values
CREATE TYPE public.user_role_new AS ENUM (
    'company_owner',
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
    WHEN role = 'company_owner' THEN 'company_owner'::public.user_role_new
    WHEN role = 'senior_dispatcher' THEN 'senior_dispatcher'::public.user_role_new
    WHEN role = 'dispatcher' THEN 'dispatcher'::public.user_role_new
    WHEN role = 'driver' THEN 'driver'::public.user_role_new
    ELSE 'driver'::public.user_role_new -- default fallback
END;

-- Make the new column NOT NULL
ALTER TABLE public.user_company_roles 
ALTER COLUMN role_new SET NOT NULL;

-- Drop the old column and enum
ALTER TABLE public.user_company_roles 
DROP COLUMN role;

DROP TYPE public.user_role;

-- Rename the new enum and column
ALTER TYPE public.user_role_new RENAME TO user_role;
ALTER TABLE public.user_company_roles 
RENAME COLUMN role_new TO role;

-- Re-enable RLS
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
    AND ucr.role IN ('company_owner') 
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
    AND ucr.role IN ('company_owner') 
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