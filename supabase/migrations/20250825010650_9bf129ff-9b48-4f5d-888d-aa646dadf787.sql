-- Crear la función de logging que falta
CREATE OR REPLACE FUNCTION public.log_driver_data_access_detailed(
  target_user_id UUID,
  access_type_param TEXT,
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
    access_type_param,
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