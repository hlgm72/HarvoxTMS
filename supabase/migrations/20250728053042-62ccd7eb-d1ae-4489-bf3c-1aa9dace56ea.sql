-- Drop all existing policies
DROP POLICY IF EXISTS "authenticated_users_select_invitations" ON public.user_invitations;
DROP POLICY IF EXISTS "authenticated_owners_insert_invitations" ON public.user_invitations;
DROP POLICY IF EXISTS "authenticated_users_update_invitations" ON public.user_invitations;
DROP POLICY IF EXISTS "authenticated_owners_delete_invitations" ON public.user_invitations;

-- Create FINAL optimized policies with SELECT-wrapped auth calls + explicit security

-- SELECT policy - performance optimized + security explicit
CREATE POLICY "authenticated_users_select_invitations"
ON public.user_invitations
FOR SELECT
TO authenticated
USING (
  (SELECT auth.role()) = 'authenticated' AND
  (SELECT auth.uid()) IS NOT NULL AND
  (SELECT (auth.jwt() ->> 'is_anonymous')::boolean) IS FALSE AND
  (
    EXISTS (
      SELECT 1 FROM public.user_company_roles ucr
      WHERE ucr.user_id = (SELECT auth.uid())
      AND ucr.company_id = user_invitations.company_id
      AND ucr.role = 'company_owner'
      AND ucr.is_active = true
    )
    OR
    email = (SELECT auth.email())
  )
);

-- INSERT policy - performance optimized + security explicit
CREATE POLICY "authenticated_owners_insert_invitations"
ON public.user_invitations
FOR INSERT
TO authenticated
WITH CHECK (
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

-- UPDATE policy - performance optimized + security explicit
CREATE POLICY "authenticated_users_update_invitations"
ON public.user_invitations
FOR UPDATE
TO authenticated
USING (
  (SELECT auth.role()) = 'authenticated' AND
  (SELECT auth.uid()) IS NOT NULL AND
  (SELECT (auth.jwt() ->> 'is_anonymous')::boolean) IS FALSE AND
  (
    EXISTS (
      SELECT 1 FROM public.user_company_roles ucr
      WHERE ucr.user_id = (SELECT auth.uid())
      AND ucr.company_id = user_invitations.company_id
      AND ucr.role = 'company_owner'
      AND ucr.is_active = true
    )
    OR
    (email = (SELECT auth.email()) AND accepted_at IS NULL)
  )
);

-- DELETE policy - performance optimized + security explicit
CREATE POLICY "authenticated_owners_delete_invitations"
ON public.user_invitations
FOR DELETE
TO authenticated
USING (
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