-- Fix anonymous access issues in RLS policies

-- First, let's update the user_company_roles policies to prevent anonymous access
DROP POLICY IF EXISTS "Users can view roles in their companies" ON public.user_company_roles;
DROP POLICY IF EXISTS "Company admins can manage user roles" ON public.user_company_roles;

-- Create improved policies that explicitly check for non-anonymous users
CREATE POLICY "Users can view roles in their companies" 
ON public.user_company_roles 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL 
  AND COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false
  AND company_id = ANY(get_user_company_ids_safe(auth.uid()))
);

CREATE POLICY "Company admins can manage user roles" 
ON public.user_company_roles 
FOR ALL 
USING (
  auth.uid() IS NOT NULL 
  AND COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false
  AND (
    is_user_admin_in_company_safe(auth.uid(), company_id) 
    OR is_user_superadmin_safe(auth.uid())
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false
  AND (
    is_user_admin_in_company_safe(auth.uid(), company_id) 
    OR is_user_superadmin_safe(auth.uid())
  )
);

-- Now fix the profiles table policies
-- First, let's see if the table exists and what policies it has
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

-- Check if profiles table exists, if not create it
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  avatar_url text,
  phone text,
  updated_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (id)
);

-- Enable RLS on profiles if not already enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create secure policies for profiles that prevent anonymous access
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL 
  AND COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false
  AND (id = auth.uid() OR user_id = auth.uid())
);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (
  auth.uid() IS NOT NULL 
  AND COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false
  AND (id = auth.uid() OR user_id = auth.uid())
)
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false
  AND (id = auth.uid() OR user_id = auth.uid())
);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false
  AND (id = auth.uid() OR user_id = auth.uid())
);