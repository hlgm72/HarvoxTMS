-- Eliminar políticas problemáticas
DROP POLICY IF EXISTS "Consolidated user invitations select policy" ON public.user_invitations;
DROP POLICY IF EXISTS "Consolidated user invitations insert policy" ON public.user_invitations;
DROP POLICY IF EXISTS "Consolidated user invitations update policy" ON public.user_invitations;
DROP POLICY IF EXISTS "Consolidated user invitations delete policy" ON public.user_invitations;

-- Crear políticas EXACTAMENTE como la tabla companies que SÍ funciona
CREATE POLICY "Consolidated user invitations select policy" 
ON public.user_invitations 
FOR SELECT 
USING (
  (SELECT auth.uid()) IS NOT NULL AND 
  (((SELECT auth.jwt()) ->> 'is_anonymous')::boolean IS FALSE) AND 
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
  (SELECT auth.uid()) IS NOT NULL AND 
  (((SELECT auth.jwt()) ->> 'is_anonymous')::boolean IS FALSE) AND
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
  (SELECT auth.uid()) IS NOT NULL AND 
  (((SELECT auth.jwt()) ->> 'is_anonymous')::boolean IS FALSE) AND 
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
  (SELECT auth.uid()) IS NOT NULL AND 
  (((SELECT auth.jwt()) ->> 'is_anonymous')::boolean IS FALSE) AND 
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
  (SELECT auth.uid()) IS NOT NULL AND 
  (((SELECT auth.jwt()) ->> 'is_anonymous')::boolean IS FALSE) AND 
  EXISTS (
    SELECT 1 FROM public.user_company_roles ucr
    WHERE ucr.user_id = (SELECT auth.uid())
    AND ucr.company_id = user_invitations.company_id
    AND ucr.role = 'company_owner'
    AND ucr.is_active = true
  )
);