-- Optimizar políticas RLS para mejor rendimiento
-- Reemplazar auth.<function>() con (select auth.<function>()) para evitar re-evaluación por fila

-- Actualizar política de profiles
DROP POLICY IF EXISTS "Profiles admin and user access" ON public.profiles;

CREATE POLICY "Profiles admin and user access" ON public.profiles
FOR ALL
TO authenticated
USING (
  -- Service role siempre tiene acceso
  ((select auth.role()) = 'service_role') OR
  -- El usuario puede ver su propio perfil
  (select auth.uid()) = user_id OR
  -- Los administradores pueden ver perfiles de usuarios de su empresa
  (
    EXISTS (
      SELECT 1 FROM public.user_company_roles ucr_admin
      WHERE ucr_admin.user_id = (select auth.uid())
      AND ucr_admin.role IN ('superadmin', 'company_owner', 'general_manager', 'operations_manager')
      AND ucr_admin.is_active = true
      AND ucr_admin.company_id IN (
        SELECT ucr_target.company_id 
        FROM public.user_company_roles ucr_target 
        WHERE ucr_target.user_id = profiles.user_id 
        AND ucr_target.is_active = true
      )
    )
  )
)
WITH CHECK (
  -- Service role siempre puede modificar
  ((select auth.role()) = 'service_role') OR
  -- Solo el propietario del perfil puede modificarlo
  (select auth.uid()) = user_id
);

-- Actualizar política de user_invitations
DROP POLICY IF EXISTS "User invitations unified access" ON public.user_invitations;

CREATE POLICY "User invitations unified access" ON public.user_invitations
FOR ALL
TO authenticated
USING (
  -- Service role siempre tiene acceso
  ((select auth.role()) = 'service_role') OR
  -- SuperAdmin tiene acceso completo
  is_superadmin((select auth.uid())) OR
  -- Email matches (para usuarios invitados que ven su propia invitación)
  email = (select auth.email()) OR
  -- Administradores de la empresa pueden ver/gestionar invitaciones
  (
    company_id IN (
      SELECT ucr.company_id 
      FROM public.user_company_roles ucr
      WHERE ucr.user_id = (select auth.uid())
      AND ucr.role IN ('company_owner', 'general_manager', 'operations_manager', 'senior_dispatcher')
      AND ucr.is_active = true
    )
  )
)
WITH CHECK (
  -- Service role puede crear/modificar
  ((select auth.role()) = 'service_role') OR
  -- SuperAdmin puede crear/modificar
  is_superadmin((select auth.uid())) OR
  -- Administradores pueden crear invitaciones para su empresa
  (
    company_id IN (
      SELECT ucr.company_id 
      FROM public.user_company_roles ucr
      WHERE ucr.user_id = (select auth.uid())
      AND ucr.role IN ('company_owner', 'general_manager', 'operations_manager', 'senior_dispatcher')
      AND ucr.is_active = true
    )
  )
);