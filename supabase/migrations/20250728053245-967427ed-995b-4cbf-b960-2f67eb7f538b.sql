-- Crear funciones optimizadas para evitar re-evaluación de auth en RLS
CREATE OR REPLACE FUNCTION public.get_current_user_for_rls()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.get_current_user_email_for_rls()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT auth.email();
$$;

CREATE OR REPLACE FUNCTION public.is_authenticated_non_anon_for_rls()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    auth.role() = 'authenticated' AND
    auth.uid() IS NOT NULL AND 
    COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false;
$$;

-- Eliminar políticas existentes
DROP POLICY IF EXISTS "authenticated_users_select_invitations" ON public.user_invitations;
DROP POLICY IF EXISTS "authenticated_owners_insert_invitations" ON public.user_invitations;
DROP POLICY IF EXISTS "authenticated_users_update_invitations" ON public.user_invitations;
DROP POLICY IF EXISTS "authenticated_owners_delete_invitations" ON public.user_invitations;

-- Crear políticas optimizadas usando funciones
CREATE POLICY "authenticated_users_select_invitations"
ON public.user_invitations
FOR SELECT
TO authenticated
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

CREATE POLICY "authenticated_owners_insert_invitations"
ON public.user_invitations
FOR INSERT
TO authenticated
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

CREATE POLICY "authenticated_users_update_invitations"
ON public.user_invitations
FOR UPDATE
TO authenticated
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

CREATE POLICY "authenticated_owners_delete_invitations"
ON public.user_invitations
FOR DELETE
TO authenticated
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