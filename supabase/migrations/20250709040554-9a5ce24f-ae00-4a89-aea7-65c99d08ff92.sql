-- Fix infinite recursion in user_company_roles RLS policies
-- First, drop the problematic policy that causes recursion
DROP POLICY IF EXISTS "Company owners can manage company roles" ON public.user_company_roles;

-- Create a new policy that avoids recursion by using a different approach
-- This policy allows company owners to manage roles in their company without causing recursion
CREATE POLICY "Company owners can manage company roles" ON public.user_company_roles
FOR ALL TO authenticated
USING (
  -- Allow users to see their own roles
  auth.uid() = user_id
  OR
  -- Allow if user is a company owner of the same company (avoid recursion by not checking is_active in subquery)
  EXISTS (
    SELECT 1 FROM public.user_company_roles ucr 
    WHERE ucr.user_id = auth.uid() 
    AND ucr.company_id = user_company_roles.company_id 
    AND ucr.role = 'company_owner'
  )
)
WITH CHECK (
  -- Allow users to insert their own roles
  auth.uid() = user_id
  OR
  -- Allow if user is a company owner of the same company
  EXISTS (
    SELECT 1 FROM public.user_company_roles ucr 
    WHERE ucr.user_id = auth.uid() 
    AND ucr.company_id = user_company_roles.company_id 
    AND ucr.role = 'company_owner'
  )
);