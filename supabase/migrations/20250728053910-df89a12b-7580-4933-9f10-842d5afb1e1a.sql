-- Eliminar políticas que causan problemas
DROP POLICY IF EXISTS "optimized_users_select_invitations" ON public.user_invitations;
DROP POLICY IF EXISTS "optimized_owners_insert_invitations" ON public.user_invitations;
DROP POLICY IF EXISTS "optimized_users_update_invitations" ON public.user_invitations;
DROP POLICY IF EXISTS "optimized_owners_delete_invitations" ON public.user_invitations;

-- Crear políticas consolidadas siguiendo el patrón que ya funciona
CREATE POLICY "Consolidated user invitations select policy" 
ON public.user_invitations 
FOR SELECT 
USING (
  require_authenticated_user() AND 
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

CREATE POLICY "Consolidated user invitations insert policy" 
ON public.user_invitations 
FOR INSERT 
WITH CHECK (
  require_authenticated_user() AND 
  EXISTS (
    SELECT 1 FROM public.user_company_roles ucr
    WHERE ucr.user_id = (SELECT auth.uid())
    AND ucr.company_id = user_invitations.company_id
    AND ucr.role = 'company_owner'
    AND ucr.is_active = true
  )
);

CREATE POLICY "Consolidated user invitations update policy" 
ON public.user_invitations 
FOR UPDATE 
USING (
  require_authenticated_user() AND 
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
)
WITH CHECK (
  require_authenticated_user() AND 
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

CREATE POLICY "Consolidated user invitations delete policy" 
ON public.user_invitations 
FOR DELETE 
USING (
  require_authenticated_user() AND 
  EXISTS (
    SELECT 1 FROM public.user_company_roles ucr
    WHERE ucr.user_id = (SELECT auth.uid())
    AND ucr.company_id = user_invitations.company_id
    AND ucr.role = 'company_owner'
    AND ucr.is_active = true
  )
);