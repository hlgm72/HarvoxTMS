-- Drop existing policies and create completely restrictive ones that exclude all anonymous access

-- Drop existing policies
DROP POLICY IF EXISTS "Authenticated users can view relevant invitations" ON public.user_invitations;
DROP POLICY IF EXISTS "Authenticated company owners can create invitations" ON public.user_invitations;
DROP POLICY IF EXISTS "Authenticated users can update relevant invitations" ON public.user_invitations;
DROP POLICY IF EXISTS "Authenticated company owners can delete invitations" ON public.user_invitations;

-- Create highly restrictive policies that completely exclude anonymous access

-- SELECT policy - only for authenticated, non-anonymous users
CREATE POLICY "Strictly authenticated users can view invitations" 
ON public.user_invitations 
FOR SELECT 
TO authenticated
USING (
  (SELECT auth.role()) = 'authenticated' AND
  (SELECT auth.uid()) IS NOT NULL AND 
  (SELECT (auth.jwt()->>'is_anonymous')::boolean) IS FALSE AND
  (
    -- Company owners can see invitations for their company
    EXISTS (
      SELECT 1 FROM public.user_company_roles ucr
      WHERE ucr.user_id = (SELECT auth.uid())
      AND ucr.company_id = user_invitations.company_id
      AND ucr.role = 'company_owner'
      AND ucr.is_active = true
    )
    OR
    -- Users can see invitations sent to their email
    (email = (SELECT auth.email()))
  )
);

-- INSERT policy - only for authenticated, non-anonymous company owners
CREATE POLICY "Strictly authenticated company owners can create invitations" 
ON public.user_invitations 
FOR INSERT 
TO authenticated
WITH CHECK (
  (SELECT auth.role()) = 'authenticated' AND
  (SELECT auth.uid()) IS NOT NULL AND 
  (SELECT (auth.jwt()->>'is_anonymous')::boolean) IS FALSE AND
  EXISTS (
    SELECT 1 FROM public.user_company_roles ucr
    WHERE ucr.user_id = (SELECT auth.uid())
    AND ucr.company_id = user_invitations.company_id
    AND ucr.role = 'company_owner'
    AND ucr.is_active = true
  )
);

-- UPDATE policy - only for authenticated, non-anonymous users
CREATE POLICY "Strictly authenticated users can update invitations" 
ON public.user_invitations 
FOR UPDATE 
TO authenticated
USING (
  (SELECT auth.role()) = 'authenticated' AND
  (SELECT auth.uid()) IS NOT NULL AND 
  (SELECT (auth.jwt()->>'is_anonymous')::boolean) IS FALSE AND
  (
    -- Company owners can update invitations for their company
    EXISTS (
      SELECT 1 FROM public.user_company_roles ucr
      WHERE ucr.user_id = (SELECT auth.uid())
      AND ucr.company_id = user_invitations.company_id
      AND ucr.role = 'company_owner'
      AND ucr.is_active = true
    )
    OR
    -- Users can accept invitations sent to their email
    (email = (SELECT auth.email()) AND accepted_at IS NULL)
  )
);

-- DELETE policy - only for authenticated, non-anonymous company owners
CREATE POLICY "Strictly authenticated company owners can delete invitations" 
ON public.user_invitations 
FOR DELETE 
TO authenticated
USING (
  (SELECT auth.role()) = 'authenticated' AND
  (SELECT auth.uid()) IS NOT NULL AND 
  (SELECT (auth.jwt()->>'is_anonymous')::boolean) IS FALSE AND
  EXISTS (
    SELECT 1 FROM public.user_company_roles ucr
    WHERE ucr.user_id = (SELECT auth.uid())
    AND ucr.company_id = user_invitations.company_id
    AND ucr.role = 'company_owner'
    AND ucr.is_active = true
  )
);