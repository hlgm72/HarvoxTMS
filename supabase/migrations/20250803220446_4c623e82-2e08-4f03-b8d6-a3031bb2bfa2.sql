-- Fix overlapping policies by making admin policy only for INSERT/UPDATE/DELETE

-- Drop the admin policy that was covering ALL operations
DROP POLICY IF EXISTS "User invitations admin management policy" ON public.user_invitations;

-- Create separate policies for each admin operation (excluding SELECT)
CREATE POLICY "User invitations admin insert policy"
ON public.user_invitations
FOR INSERT
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

CREATE POLICY "User invitations admin update policy"
ON public.user_invitations
FOR UPDATE
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

CREATE POLICY "User invitations admin delete policy"
ON public.user_invitations
FOR DELETE
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
);