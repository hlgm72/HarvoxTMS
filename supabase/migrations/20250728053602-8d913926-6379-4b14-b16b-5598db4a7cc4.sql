-- Eliminar todas las políticas existentes
DROP POLICY IF EXISTS "non_anon_users_select_invitations" ON public.user_invitations;
DROP POLICY IF EXISTS "non_anon_owners_insert_invitations" ON public.user_invitations;
DROP POLICY IF EXISTS "non_anon_users_update_invitations" ON public.user_invitations;
DROP POLICY IF EXISTS "non_anon_owners_delete_invitations" ON public.user_invitations;

-- Crear políticas que excluyen explícitamente usuarios anónimos SIN especificar TO
CREATE POLICY "secure_users_select_invitations"
ON public.user_invitations
FOR SELECT
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

CREATE POLICY "secure_owners_insert_invitations"
ON public.user_invitations
FOR INSERT
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

CREATE POLICY "secure_users_update_invitations"
ON public.user_invitations
FOR UPDATE
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

CREATE POLICY "secure_owners_delete_invitations"
ON public.user_invitations
FOR DELETE
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