-- Find and drop ALL policies that reference the user_role enum
-- We'll drop all policies on tables that use user_role and recreate them

-- Drop policies on user_company_roles
DROP POLICY IF EXISTS "Consolidated company roles delete policy" ON public.user_company_roles;
DROP POLICY IF EXISTS "Consolidated company roles insert policy" ON public.user_company_roles;
DROP POLICY IF EXISTS "Consolidated company roles select policy" ON public.user_company_roles;
DROP POLICY IF EXISTS "Consolidated company roles update policy" ON public.user_company_roles;

-- Drop policies on user_invitations
DROP POLICY IF EXISTS "User invitations admin insert policy" ON public.user_invitations;
DROP POLICY IF EXISTS "User invitations admin select policy" ON public.user_invitations;
DROP POLICY IF EXISTS "User invitations admin update policy" ON public.user_invitations;
DROP POLICY IF EXISTS "User invitations admin delete policy" ON public.user_invitations;

-- Drop policies on recurring_expense_templates
DROP POLICY IF EXISTS "recurring_expense_templates_insert" ON public.recurring_expense_templates;
DROP POLICY IF EXISTS "recurring_expense_templates_select" ON public.recurring_expense_templates;
DROP POLICY IF EXISTS "recurring_expense_templates_update" ON public.recurring_expense_templates;
DROP POLICY IF EXISTS "recurring_expense_templates_delete" ON public.recurring_expense_templates;

-- Update has_role function to be text-based temporarily
DROP FUNCTION IF EXISTS public.has_role(uuid, user_role);
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_company_roles
    WHERE user_id = _user_id
      AND role::text = _role
      AND is_active = true
  );
$$;

-- Update user_role enum
DROP TYPE IF EXISTS user_role CASCADE;
CREATE TYPE user_role AS ENUM (
  'superadmin',
  'company_owner', 
  'company_admin',
  'dispatcher',
  'driver',
  'multi_company_dispatcher'
);

-- Update columns to use new enum
ALTER TABLE user_company_roles ALTER COLUMN role TYPE user_role USING role::text::user_role;
ALTER TABLE user_invitations ALTER COLUMN role TYPE user_role USING role::text::user_role;

-- Recreate has_role function with proper enum type
DROP FUNCTION IF EXISTS public.has_role(uuid, text);
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