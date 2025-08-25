-- Crear la función que falta para el acceso a datos sensibles de drivers
CREATE OR REPLACE FUNCTION public.can_access_driver_highly_sensitive_data(target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Solo permitir acceso si:
  -- 1. Es el propio usuario
  -- 2. Es un superadmin  
  -- 3. Es company_owner en la misma empresa que el driver
  -- 4. Es operations_manager en la misma empresa que el driver
  
  RETURN (
    -- Es el propio usuario
    auth.uid() = target_user_id
    OR
    -- Es superadmin
    EXISTS (
      SELECT 1 FROM user_company_roles
      WHERE user_id = auth.uid()
      AND role = 'superadmin'
      AND is_active = true
    )
    OR
    -- Es company_owner o operations_manager en la misma empresa
    EXISTS (
      SELECT 1 
      FROM user_company_roles ucr1
      JOIN user_company_roles ucr2 ON ucr1.company_id = ucr2.company_id
      WHERE ucr1.user_id = auth.uid()
      AND ucr2.user_id = target_user_id
      AND ucr1.role IN ('company_owner', 'operations_manager')
      AND ucr1.is_active = true
      AND ucr2.is_active = true
    )
  );
END;
$$;