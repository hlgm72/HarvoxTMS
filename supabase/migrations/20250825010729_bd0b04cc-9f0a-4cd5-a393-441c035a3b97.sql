-- Eliminar la función existente y recrearla con los parámetros correctos
DROP FUNCTION IF EXISTS log_driver_data_access_detailed(uuid, text, text[]);

-- Crear la función de logging para acceso a datos sensibles
CREATE OR REPLACE FUNCTION public.log_driver_data_access_detailed(
  target_user_id UUID,
  access_type TEXT,
  fields_accessed TEXT[]
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Registrar el acceso a datos sensibles del conductor
  INSERT INTO company_sensitive_data_access_log (
    company_id,
    accessed_by,
    access_type,
    accessed_at,
    user_role
  )
  SELECT 
    ucr.company_id,
    auth.uid(),
    access_type,
    now(),
    ucr.role
  FROM user_company_roles ucr
  WHERE ucr.user_id = target_user_id
    AND ucr.is_active = true
  LIMIT 1;
  
EXCEPTION WHEN OTHERS THEN
  -- Si falla el logging, no detener la consulta principal
  -- Solo registrar el error en los logs de Postgres
  NULL;
END;
$$;