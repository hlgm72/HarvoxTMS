-- Completely drop the policy and create ultra-explicit role-based policies
DROP POLICY IF EXISTS "user_invitations_authenticated_access_only" ON public.user_invitations;

-- Create separate, ultra-explicit policies for each operation that the linter cannot misinterpret

-- SELECT policy - explicit authenticated role only
CREATE POLICY "authenticated_users_select_invitations"
ON public.user_invitations
FOR SELECT
TO authenticated
USING (
  -- Triple-check: must be authenticated AND not anonymous AND have valid access
  auth.role() = 'authenticated' AND
  auth.uid() IS NOT NULL AND
  (auth.jwt() ->> 'is_anonymous')::boolean IS FALSE AND
  (
    EXISTS (
      SELECT 1 FROM public.user_company_roles ucr
      WHERE ucr.user_id = auth.uid()
      AND ucr.company_id = user_invitations.company_id
      AND ucr.role = 'company_owner'
      AND ucr.is_active = true
    )
    OR
    email = auth.email()
  )
);

-- INSERT policy - explicit authenticated role only  
CREATE POLICY "authenticated_owners_insert_invitations"
ON public.user_invitations
FOR INSERT
TO authenticated
WITH CHECK (
  auth.role() = 'authenticated' AND
  auth.uid() IS NOT NULL AND
  (auth.jwt() ->> 'is_anonymous')::boolean IS FALSE AND
  EXISTS (
    SELECT 1 FROM public.user_company_roles ucr
    WHERE ucr.user_id = auth.uid()
    AND ucr.company_id = user_invitations.company_id
    AND ucr.role = 'company_owner'
    AND ucr.is_active = true
  )
);

-- UPDATE policy - explicit authenticated role only
CREATE POLICY "authenticated_users_update_invitations"
ON public.user_invitations
FOR UPDATE
TO authenticated
USING (
  auth.role() = 'authenticated' AND
  auth.uid() IS NOT NULL AND
  (auth.jwt() ->> 'is_anonymous')::boolean IS FALSE AND
  (
    EXISTS (
      SELECT 1 FROM public.user_company_roles ucr
      WHERE ucr.user_id = auth.uid()
      AND ucr.company_id = user_invitations.company_id
      AND ucr.role = 'company_owner'
      AND ucr.is_active = true
    )
    OR
    (email = auth.email() AND accepted_at IS NULL)
  )
);

-- DELETE policy - explicit authenticated role only
CREATE POLICY "authenticated_owners_delete_invitations"
ON public.user_invitations
FOR DELETE
TO authenticated
USING (
  auth.role() = 'authenticated' AND
  auth.uid() IS NOT NULL AND
  (auth.jwt() ->> 'is_anonymous')::boolean IS FALSE AND
  EXISTS (
    SELECT 1 FROM public.user_company_roles ucr
    WHERE ucr.user_id = auth.uid()
    AND ucr.company_id = user_invitations.company_id
    AND ucr.role = 'company_owner'
    AND ucr.is_active = true
  )
);