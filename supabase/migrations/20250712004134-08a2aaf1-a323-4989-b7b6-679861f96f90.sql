-- Verificar y actualizar políticas RLS para user_invitations
DROP POLICY IF EXISTS "User invitations comprehensive policy" ON public.user_invitations;

-- Nueva política que permite a administradores ver invitaciones de su empresa
CREATE POLICY "User invitations admin access" ON public.user_invitations
FOR ALL
TO authenticated
USING (
  -- Service role siempre tiene acceso
  (SELECT auth.role() = 'service_role') OR
  -- Los administradores pueden ver invitaciones de su empresa
  (
    EXISTS (
      SELECT 1 FROM public.user_company_roles ucr
      WHERE ucr.user_id = auth.uid() 
      AND ucr.company_id = user_invitations.company_id
      AND ucr.role IN ('superadmin', 'company_owner', 'general_manager', 'operations_manager')
      AND ucr.is_active = true
    )
  )
)
WITH CHECK (
  -- Service role puede crear/modificar
  (SELECT auth.role() = 'service_role') OR
  -- Los administradores pueden crear invitaciones para su empresa
  (
    EXISTS (
      SELECT 1 FROM public.user_company_roles ucr
      WHERE ucr.user_id = auth.uid() 
      AND ucr.company_id = user_invitations.company_id
      AND ucr.role IN ('superadmin', 'company_owner', 'general_manager', 'operations_manager')
      AND ucr.is_active = true
    )
  )
);