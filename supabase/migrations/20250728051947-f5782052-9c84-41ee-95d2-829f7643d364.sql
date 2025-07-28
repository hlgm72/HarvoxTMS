-- Drop existing policies
DROP POLICY IF EXISTS "Strict authenticated select invitations" ON public.user_invitations;
DROP POLICY IF EXISTS "Strict authenticated insert invitations" ON public.user_invitations;
DROP POLICY IF EXISTS "Strict authenticated update invitations" ON public.user_invitations;
DROP POLICY IF EXISTS "Strict authenticated delete invitations" ON public.user_invitations;

-- Create performance-optimized policies with SELECT-wrapped auth calls while maintaining security

-- SELECT policy - optimized auth calls + secured to authenticated only
CREATE POLICY "Optimized secure select invitations" 
ON public.user_invitations 
FOR SELECT 
TO authenticated
USING (
  (SELECT auth.uid()) IS NOT NULL AND
  (SELECT auth.role()) = 'authenticated' AND
  COALESCE((SELECT (auth.jwt()->>'is_anonymous')::boolean), true) = false AND
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

-- INSERT policy - optimized auth calls + secured to authenticated only
CREATE POLICY "Optimized secure insert invitations" 
ON public.user_invitations 
FOR INSERT 
TO authenticated
WITH CHECK (
  (SELECT auth.uid()) IS NOT NULL AND
  (SELECT auth.role()) = 'authenticated' AND
  COALESCE((SELECT (auth.jwt()->>'is_anonymous')::boolean), true) = false AND
  EXISTS (
    SELECT 1 FROM public.user_company_roles ucr
    WHERE ucr.user_id = (SELECT auth.uid())
    AND ucr.company_id = user_invitations.company_id
    AND ucr.role = 'company_owner'
    AND ucr.is_active = true
  )
);

-- UPDATE policy - optimized auth calls + secured to authenticated only
CREATE POLICY "Optimized secure update invitations" 
ON public.user_invitations 
FOR UPDATE 
TO authenticated
USING (
  (SELECT auth.uid()) IS NOT NULL AND
  (SELECT auth.role()) = 'authenticated' AND
  COALESCE((SELECT (auth.jwt()->>'is_anonymous')::boolean), true) = false AND
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

-- DELETE policy - optimized auth calls + secured to authenticated only
CREATE POLICY "Optimized secure delete invitations" 
ON public.user_invitations 
FOR DELETE 
TO authenticated
USING (
  (SELECT auth.uid()) IS NOT NULL AND
  (SELECT auth.role()) = 'authenticated' AND
  COALESCE((SELECT (auth.jwt()->>'is_anonymous')::boolean), true) = false AND
  EXISTS (
    SELECT 1 FROM public.user_company_roles ucr
    WHERE ucr.user_id = (SELECT auth.uid())
    AND ucr.company_id = user_invitations.company_id
    AND ucr.role = 'company_owner'
    AND ucr.is_active = true
  )
);