-- Fix security issues detected by scanner
-- Create more secure RLS policies for sensitive tables

-- =======================
-- 1. Fix profiles table access (using user_id as the key)
-- =======================
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;

CREATE POLICY "Users can view profiles in their company only" 
ON public.profiles 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND 
  (
    -- Users can see their own profile
    user_id = auth.uid() OR
    -- Users can see profiles of people in their company
    EXISTS (
      SELECT 1 FROM user_company_roles ucr1
      JOIN user_company_roles ucr2 ON ucr1.company_id = ucr2.company_id
      WHERE ucr1.user_id = profiles.user_id
      AND ucr2.user_id = auth.uid()
      AND ucr1.is_active = true
      AND ucr2.is_active = true
    )
  )
);

-- =======================
-- 2. Fix owner_operators table access (no company_id, use user relationship)
-- =======================
DROP POLICY IF EXISTS "Owner operators company access" ON public.owner_operators;

CREATE POLICY "Owner operators secure company access" 
ON public.owner_operators 
FOR ALL 
USING (
  auth.uid() IS NOT NULL AND
  NOT COALESCE((auth.jwt() ->> 'is_anonymous')::boolean, false) AND
  (
    -- Users can see their own owner operator record
    user_id = auth.uid() OR
    -- Company admins can see owner operators in their company
    user_id IN (
      SELECT ucr1.user_id
      FROM user_company_roles ucr1
      JOIN user_company_roles ucr2 ON ucr1.company_id = ucr2.company_id
      WHERE ucr2.user_id = auth.uid()
      AND ucr1.is_active = true
      AND ucr2.is_active = true
      AND ucr2.role IN ('company_owner', 'operations_manager', 'superadmin')
    )
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL AND
  NOT COALESCE((auth.jwt() ->> 'is_anonymous')::boolean, false)
);