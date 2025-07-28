-- Drop the existing policy
DROP POLICY IF EXISTS "user_invitations_authenticated_access_only" ON public.user_invitations;

-- Create the FINAL policy with explicit inline auth checks that the linter can understand
CREATE POLICY "user_invitations_authenticated_access_only"
ON public.user_invitations
FOR ALL
TO authenticated
USING (
  -- Explicit inline checks that the linter can parse
  (SELECT auth.role()) = 'authenticated' AND
  (SELECT auth.uid()) IS NOT NULL AND
  (SELECT (auth.jwt() ->> 'is_anonymous')::boolean) IS FALSE AND
  (
    -- FOR SELECT and UPDATE: Company owners can see/modify invitations for their company
    (
      EXISTS (
        SELECT 1 FROM public.user_company_roles ucr
        WHERE ucr.user_id = (SELECT auth.uid())
        AND ucr.company_id = user_invitations.company_id
        AND ucr.role = 'company_owner'
        AND ucr.is_active = true
      )
    )
    OR
    -- FOR SELECT and UPDATE: Users can see/accept invitations sent to their email
    (
      email = (SELECT auth.email()) AND 
      (accepted_at IS NULL OR accepted_at IS NOT NULL)
    )
  )
)
WITH CHECK (
  -- FOR INSERT and UPDATE: Only authenticated company owners can create/modify
  (SELECT auth.role()) = 'authenticated' AND
  (SELECT auth.uid()) IS NOT NULL AND
  (SELECT (auth.jwt() ->> 'is_anonymous')::boolean) IS FALSE AND
  EXISTS (
    SELECT 1 FROM public.user_company_roles ucr
    WHERE ucr.user_id = (SELECT auth.uid())
    AND ucr.company_id = user_invitations.company_id
    AND ucr.role = 'company_owner'
    AND ucr.is_active = true
  )
);