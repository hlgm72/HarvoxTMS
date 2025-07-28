-- Eliminar políticas actuales que tienen problemas de performance
DROP POLICY IF EXISTS "secure_users_select_invitations" ON public.user_invitations;
DROP POLICY IF EXISTS "secure_owners_insert_invitations" ON public.user_invitations;
DROP POLICY IF EXISTS "secure_users_update_invitations" ON public.user_invitations;
DROP POLICY IF EXISTS "secure_owners_delete_invitations" ON public.user_invitations;

-- Crear políticas optimizadas usando las funciones SECURITY DEFINER
CREATE POLICY "optimized_users_select_invitations"
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

CREATE POLICY "optimized_owners_insert_invitations"
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

CREATE POLICY "optimized_users_update_invitations"
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

CREATE POLICY "optimized_owners_delete_invitations"
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