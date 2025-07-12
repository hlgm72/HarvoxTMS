-- Actualizar políticas RLS para la tabla profiles para permitir acceso administrativo
DROP POLICY IF EXISTS "Profiles comprehensive access" ON public.profiles;

-- Política más amplia que permite acceso administrativo
CREATE POLICY "Profiles admin and user access" ON public.profiles
FOR ALL
TO authenticated
USING (
  -- Service role siempre tiene acceso
  (SELECT auth.role() = 'service_role') OR
  -- El usuario puede ver su propio perfil
  auth.uid() = user_id OR
  -- Los administradores pueden ver perfiles de usuarios de su empresa
  (
    EXISTS (
      SELECT 1 FROM public.user_company_roles ucr_admin
      WHERE ucr_admin.user_id = auth.uid() 
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
  (SELECT auth.role() = 'service_role') OR
  -- Solo el propietario del perfil puede modificarlo
  auth.uid() = user_id
);