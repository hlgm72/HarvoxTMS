-- Fix RLS performance issues on user_invitations table

-- Drop existing policies
DROP POLICY IF EXISTS "Company users can view invitations" ON public.user_invitations;
DROP POLICY IF EXISTS "Company admins can manage invitations" ON public.user_invitations;

-- Create optimized consolidated policy for SELECT operations
CREATE POLICY "User invitations access policy"
ON public.user_invitations
FOR SELECT
USING (
  (SELECT auth.uid()) IS NOT NULL AND 
  COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false AND
  company_id IN (
    SELECT ucr.company_id 
    FROM user_company_roles ucr 
    WHERE ucr.user_id = (SELECT auth.uid()) AND ucr.is_active = true
  )
);

-- Create separate policy for INSERT/UPDATE/DELETE operations (admin only)
CREATE POLICY "User invitations admin management policy"
ON public.user_invitations
FOR ALL
USING (
  (SELECT auth.uid()) IS NOT NULL AND 
  COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false AND
  company_id IN (
    SELECT ucr.company_id 
    FROM user_company_roles ucr 
    WHERE ucr.user_id = (SELECT auth.uid()) 
    AND ucr.role IN ('company_owner', 'operations_manager', 'superadmin')
    AND ucr.is_active = true
  )
)
WITH CHECK (
  (SELECT auth.uid()) IS NOT NULL AND 
  COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false AND
  company_id IN (
    SELECT ucr.company_id 
    FROM user_company_roles ucr 
    WHERE ucr.user_id = (SELECT auth.uid()) 
    AND ucr.role IN ('company_owner', 'operations_manager', 'superadmin')
    AND ucr.is_active = true
  )
);