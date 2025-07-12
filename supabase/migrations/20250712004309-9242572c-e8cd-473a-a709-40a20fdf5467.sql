-- Limpiar políticas existentes y crear una nueva
DROP POLICY IF EXISTS "User invitations admin access" ON public.user_invitations;
DROP POLICY IF EXISTS "User invitations complete access" ON public.user_invitations;

-- Crear política unificada que funcione correctamente
CREATE POLICY "User invitations unified access" ON public.user_invitations
FOR ALL
TO authenticated
USING (
  -- Service role siempre tiene acceso
  (SELECT auth.role() = 'service_role') OR
  -- SuperAdmin tiene acceso completo
  is_superadmin(auth.uid()) OR
  -- Email matches (para usuarios invitados que ven su propia invitación)
  email = (SELECT auth.email()) OR
  -- Administradores de la empresa pueden ver/gestionar invitaciones
  (
    company_id IN (
      SELECT ucr.company_id 
      FROM public.user_company_roles ucr
      WHERE ucr.user_id = auth.uid() 
      AND ucr.role IN ('company_owner', 'general_manager', 'operations_manager', 'senior_dispatcher')
      AND ucr.is_active = true
    )
  )
)
WITH CHECK (
  -- Service role puede crear/modificar
  (SELECT auth.role() = 'service_role') OR
  -- SuperAdmin puede crear/modificar
  is_superadmin(auth.uid()) OR
  -- Administradores pueden crear invitaciones para su empresa
  (
    company_id IN (
      SELECT ucr.company_id 
      FROM public.user_company_roles ucr
      WHERE ucr.user_id = auth.uid() 
      AND ucr.role IN ('company_owner', 'general_manager', 'operations_manager', 'senior_dispatcher')
      AND ucr.is_active = true
    )
  )
);