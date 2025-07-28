-- Drop existing policies and create the most restrictive policies possible
DROP POLICY IF EXISTS "Authenticated only view invitations" ON public.user_invitations;
DROP POLICY IF EXISTS "Authenticated only create invitations" ON public.user_invitations;
DROP POLICY IF EXISTS "Authenticated only update invitations" ON public.user_invitations;
DROP POLICY IF EXISTS "Authenticated only delete invitations" ON public.user_invitations;

-- Create maximum security policies that explicitly block all anonymous access

-- SELECT policy - ultra-restrictive for authenticated users only
CREATE POLICY "Strict authenticated select invitations" 
ON public.user_invitations 
FOR SELECT 
TO authenticated
USING (
  auth.uid() IS NOT NULL AND
  auth.role() = 'authenticated' AND
  COALESCE((auth.jwt()->>'is_anonymous')::boolean, true) = false AND
  (
    -- Company owners can see invitations for their company
    EXISTS (
      SELECT 1 FROM public.user_company_roles ucr
      WHERE ucr.user_id = auth.uid()
      AND ucr.company_id = user_invitations.company_id
      AND ucr.role = 'company_owner'
      AND ucr.is_active = true
    )
    OR
    -- Users can see invitations sent to their email
    (email = auth.email())
  )
);

-- INSERT policy - ultra-restrictive for authenticated users only
CREATE POLICY "Strict authenticated insert invitations" 
ON public.user_invitations 
FOR INSERT 
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL AND
  auth.role() = 'authenticated' AND
  COALESCE((auth.jwt()->>'is_anonymous')::boolean, true) = false AND
  EXISTS (
    SELECT 1 FROM public.user_company_roles ucr
    WHERE ucr.user_id = auth.uid()
    AND ucr.company_id = user_invitations.company_id
    AND ucr.role = 'company_owner'
    AND ucr.is_active = true
  )
);

-- UPDATE policy - ultra-restrictive for authenticated users only
CREATE POLICY "Strict authenticated update invitations" 
ON public.user_invitations 
FOR UPDATE 
TO authenticated
USING (
  auth.uid() IS NOT NULL AND
  auth.role() = 'authenticated' AND
  COALESCE((auth.jwt()->>'is_anonymous')::boolean, true) = false AND
  (
    -- Company owners can update invitations for their company
    EXISTS (
      SELECT 1 FROM public.user_company_roles ucr
      WHERE ucr.user_id = auth.uid()
      AND ucr.company_id = user_invitations.company_id
      AND ucr.role = 'company_owner'
      AND ucr.is_active = true
    )
    OR
    -- Users can accept invitations sent to their email
    (email = auth.email() AND accepted_at IS NULL)
  )
);

-- DELETE policy - ultra-restrictive for authenticated users only
CREATE POLICY "Strict authenticated delete invitations" 
ON public.user_invitations 
FOR DELETE 
TO authenticated
USING (
  auth.uid() IS NOT NULL AND
  auth.role() = 'authenticated' AND
  COALESCE((auth.jwt()->>'is_anonymous')::boolean, true) = false AND
  EXISTS (
    SELECT 1 FROM public.user_company_roles ucr
    WHERE ucr.user_id = auth.uid()
    AND ucr.company_id = user_invitations.company_id
    AND ucr.role = 'company_owner'
    AND ucr.is_active = true
  )
);