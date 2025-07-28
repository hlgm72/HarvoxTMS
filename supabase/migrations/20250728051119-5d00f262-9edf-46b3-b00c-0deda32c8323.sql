-- Final optimization using helper functions to eliminate auth re-evaluation issues

-- Drop existing policies
DROP POLICY IF EXISTS "Optimized authenticated users can view invitations" ON public.user_invitations;
DROP POLICY IF EXISTS "Optimized company owners can create invitations" ON public.user_invitations;
DROP POLICY IF EXISTS "Optimized authenticated users can update invitations" ON public.user_invitations;
DROP POLICY IF EXISTS "Optimized company owners can delete invitations" ON public.user_invitations;

-- Create final optimized policies using helper functions and proper SELECT wrapping

-- SELECT policy - using helper function for auth and proper SELECT wrapping
CREATE POLICY "Final optimized users can view invitations" 
ON public.user_invitations 
FOR SELECT 
TO authenticated
USING (
  is_authenticated_non_anon() AND
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

-- INSERT policy - using helper function for auth
CREATE POLICY "Final optimized company owners can create invitations" 
ON public.user_invitations 
FOR INSERT 
TO authenticated
WITH CHECK (
  is_authenticated_non_anon() AND
  EXISTS (
    SELECT 1 FROM public.user_company_roles ucr
    WHERE ucr.user_id = (SELECT auth.uid())
    AND ucr.company_id = user_invitations.company_id
    AND ucr.role = 'company_owner'
    AND ucr.is_active = true
  )
);

-- UPDATE policy - using helper function for auth
CREATE POLICY "Final optimized users can update invitations" 
ON public.user_invitations 
FOR UPDATE 
TO authenticated
USING (
  is_authenticated_non_anon() AND
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

-- DELETE policy - using helper function for auth
CREATE POLICY "Final optimized company owners can delete invitations" 
ON public.user_invitations 
FOR DELETE 
TO authenticated
USING (
  is_authenticated_non_anon() AND
  EXISTS (
    SELECT 1 FROM public.user_company_roles ucr
    WHERE ucr.user_id = (SELECT auth.uid())
    AND ucr.company_id = user_invitations.company_id
    AND ucr.role = 'company_owner'
    AND ucr.is_active = true
  )
);