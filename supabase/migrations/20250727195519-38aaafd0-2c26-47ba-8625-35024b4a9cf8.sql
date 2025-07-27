-- Fix infinite recursion in user_company_roles policy
-- The current policy queries user_company_roles within itself, causing infinite recursion

-- Drop the problematic policy
DROP POLICY IF EXISTS "User company roles basic access" ON public.user_company_roles;

-- Create a simple, non-recursive policy for user_company_roles
-- This policy allows users to see their own roles and superadmins to see all roles
CREATE POLICY "User company roles access" ON public.user_company_roles
FOR ALL
TO authenticated
USING (
  auth.uid() IS NOT NULL AND (
    user_id = auth.uid() OR 
    auth.uid() IN (
      -- Direct query to avoid recursion - only check for superadmin role
      SELECT user_id FROM user_company_roles 
      WHERE role = 'superadmin' AND is_active = true
    )
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL AND (
    user_id = auth.uid() OR 
    auth.uid() IN (
      -- Direct query to avoid recursion - only check for superadmin role
      SELECT user_id FROM user_company_roles 
      WHERE role = 'superadmin' AND is_active = true
    )
  )
);

-- Alternative approach: Create separate policies for different operations
-- to avoid complex logic that causes recursion

-- First, drop the single policy we just created
DROP POLICY IF EXISTS "User company roles access" ON public.user_company_roles;

-- Create specific policies for each operation type
CREATE POLICY "Users can view their own roles" ON public.user_company_roles
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL AND user_id = auth.uid());

CREATE POLICY "Users can insert their own roles" ON public.user_company_roles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

CREATE POLICY "Users can update their own roles" ON public.user_company_roles
FOR UPDATE
TO authenticated
USING (auth.uid() IS NOT NULL AND user_id = auth.uid())
WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

CREATE POLICY "Users can delete their own roles" ON public.user_company_roles
FOR DELETE
TO authenticated
USING (auth.uid() IS NOT NULL AND user_id = auth.uid());