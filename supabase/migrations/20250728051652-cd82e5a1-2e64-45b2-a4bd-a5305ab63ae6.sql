-- Drop existing policies first
DROP POLICY IF EXISTS "Performance optimized users can view invitations" ON public.user_invitations;
DROP POLICY IF EXISTS "Performance optimized company owners can create invitations" ON public.user_invitations;
DROP POLICY IF EXISTS "Performance optimized users can update invitations" ON public.user_invitations;
DROP POLICY IF EXISTS "Performance optimized company owners can delete invitations" ON public.user_invitations;

-- Create ultra-secure policies that completely exclude anonymous users with role targeting

-- SELECT policy - explicit role targeting + security function
CREATE POLICY "Authenticated only view invitations" 
ON public.user_invitations 
FOR SELECT 
TO authenticated
USING (
  public.is_authenticated_non_anonymous() AND
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

-- INSERT policy - explicit role targeting + security function
CREATE POLICY "Authenticated only create invitations" 
ON public.user_invitations 
FOR INSERT 
TO authenticated
WITH CHECK (
  public.is_authenticated_non_anonymous() AND
  EXISTS (
    SELECT 1 FROM public.user_company_roles ucr
    WHERE ucr.user_id = (SELECT auth.uid())
    AND ucr.company_id = user_invitations.company_id
    AND ucr.role = 'company_owner'
    AND ucr.is_active = true
  )
);

-- UPDATE policy - explicit role targeting + security function
CREATE POLICY "Authenticated only update invitations" 
ON public.user_invitations 
FOR UPDATE 
TO authenticated
USING (
  public.is_authenticated_non_anonymous() AND
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

-- DELETE policy - explicit role targeting + security function
CREATE POLICY "Authenticated only delete invitations" 
ON public.user_invitations 
FOR DELETE 
TO authenticated
USING (
  public.is_authenticated_non_anonymous() AND
  EXISTS (
    SELECT 1 FROM public.user_company_roles ucr
    WHERE ucr.user_id = (SELECT auth.uid())
    AND ucr.company_id = user_invitations.company_id
    AND ucr.role = 'company_owner'
    AND ucr.is_active = true
  )
);