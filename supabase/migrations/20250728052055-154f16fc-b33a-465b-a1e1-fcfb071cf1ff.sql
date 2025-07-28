-- Drop existing policies
DROP POLICY IF EXISTS "Optimized secure select invitations" ON public.user_invitations;
DROP POLICY IF EXISTS "Optimized secure insert invitations" ON public.user_invitations;
DROP POLICY IF EXISTS "Optimized secure update invitations" ON public.user_invitations;
DROP POLICY IF EXISTS "Optimized secure delete invitations" ON public.user_invitations;

-- Create ultra-optimized policies using only helper functions to eliminate all auth re-evaluation

-- SELECT policy - using only helper functions, no direct auth calls
CREATE POLICY "Helper optimized select invitations" 
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

-- INSERT policy - using only helper functions, no direct auth calls
CREATE POLICY "Helper optimized insert invitations" 
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

-- UPDATE policy - using only helper functions, no direct auth calls
CREATE POLICY "Helper optimized update invitations" 
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

-- DELETE policy - using only helper functions, no direct auth calls
CREATE POLICY "Helper optimized delete invitations" 
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