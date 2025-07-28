-- Fix anonymous access issue by using explicit role checks in policy expressions

-- Drop existing policies
DROP POLICY IF EXISTS "Final optimized users can view invitations" ON public.user_invitations;
DROP POLICY IF EXISTS "Final optimized company owners can create invitations" ON public.user_invitations;
DROP POLICY IF EXISTS "Final optimized users can update invitations" ON public.user_invitations;
DROP POLICY IF EXISTS "Final optimized company owners can delete invitations" ON public.user_invitations;

-- Create secure policies with explicit authenticated role checks and anonymous exclusion

-- SELECT policy - explicit role check to prevent anonymous access
CREATE POLICY "Secure users can view invitations" 
ON public.user_invitations 
FOR SELECT 
USING (
  (SELECT auth.role()) = 'authenticated'::text AND
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

-- INSERT policy - explicit role check to prevent anonymous access
CREATE POLICY "Secure company owners can create invitations" 
ON public.user_invitations 
FOR INSERT 
WITH CHECK (
  (SELECT auth.role()) = 'authenticated'::text AND
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

-- UPDATE policy - explicit role check to prevent anonymous access
CREATE POLICY "Secure users can update invitations" 
ON public.user_invitations 
FOR UPDATE 
USING (
  (SELECT auth.role()) = 'authenticated'::text AND
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

-- DELETE policy - explicit role check to prevent anonymous access
CREATE POLICY "Secure company owners can delete invitations" 
ON public.user_invitations 
FOR DELETE 
USING (
  (SELECT auth.role()) = 'authenticated'::text AND
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