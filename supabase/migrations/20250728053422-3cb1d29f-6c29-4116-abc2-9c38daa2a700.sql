-- Eliminar políticas existentes que permiten acceso anónimo
DROP POLICY IF EXISTS "authenticated_users_select_invitations" ON public.user_invitations;
DROP POLICY IF EXISTS "authenticated_owners_insert_invitations" ON public.user_invitations;
DROP POLICY IF EXISTS "authenticated_users_update_invitations" ON public.user_invitations;
DROP POLICY IF EXISTS "authenticated_owners_delete_invitations" ON public.user_invitations;

-- Crear políticas que excluyen explícitamente usuarios anónimos
CREATE POLICY "non_anon_users_select_invitations"
ON public.user_invitations
FOR SELECT
USING (
  public.is_authenticated_non_anon_for_rls() AND
  (
    EXISTS (
      SELECT 1 FROM public.user_company_roles ucr
      WHERE ucr.user_id = public.get_current_user_for_rls()
      AND ucr.company_id = user_invitations.company_id
      AND ucr.role = 'company_owner'
      AND ucr.is_active = true
    )
    OR
    email = public.get_current_user_email_for_rls()
  )
);

CREATE POLICY "non_anon_owners_insert_invitations"
ON public.user_invitations
FOR INSERT
WITH CHECK (
  public.is_authenticated_non_anon_for_rls() AND
  EXISTS (
    SELECT 1 FROM public.user_company_roles ucr
    WHERE ucr.user_id = public.get_current_user_for_rls()
    AND ucr.company_id = user_invitations.company_id
    AND ucr.role = 'company_owner'
    AND ucr.is_active = true
  )
);

CREATE POLICY "non_anon_users_update_invitations"
ON public.user_invitations
FOR UPDATE
USING (
  public.is_authenticated_non_anon_for_rls() AND
  (
    EXISTS (
      SELECT 1 FROM public.user_company_roles ucr
      WHERE ucr.user_id = public.get_current_user_for_rls()
      AND ucr.company_id = user_invitations.company_id
      AND ucr.role = 'company_owner'
      AND ucr.is_active = true
    )
    OR
    (email = public.get_current_user_email_for_rls() AND accepted_at IS NULL)
  )
);

CREATE POLICY "non_anon_owners_delete_invitations"
ON public.user_invitations
FOR DELETE
USING (
  public.is_authenticated_non_anon_for_rls() AND
  EXISTS (
    SELECT 1 FROM public.user_company_roles ucr
    WHERE ucr.user_id = public.get_current_user_for_rls()
    AND ucr.company_id = user_invitations.company_id
    AND ucr.role = 'company_owner'
    AND ucr.is_active = true
  )
);