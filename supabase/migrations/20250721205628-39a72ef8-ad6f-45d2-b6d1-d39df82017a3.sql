-- Crear función para verificar acceso a cargas
CREATE OR REPLACE FUNCTION public.can_access_load(load_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path TO 'public'
AS $$
DECLARE
  load_record RECORD;
  user_companies uuid[];
BEGIN
  -- Obtener los detalles de la carga
  SELECT driver_user_id, created_by INTO load_record
  FROM public.loads
  WHERE id = load_id_param;
  
  -- Si no se encuentra la carga, denegar acceso
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- Obtener las empresas del usuario
  SELECT ARRAY_AGG(company_id) INTO user_companies
  FROM public.user_company_roles
  WHERE user_id = auth.uid() AND is_active = true;
  
  -- Permitir acceso si:
  -- 1. El usuario es el conductor
  -- 2. El usuario creó la carga
  -- 3. El usuario está en la misma empresa que el conductor o creador
  RETURN (
    load_record.driver_user_id = auth.uid() OR
    load_record.created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.user_company_roles ucr
      WHERE ucr.user_id IN (load_record.driver_user_id, load_record.created_by)
        AND ucr.company_id = ANY(user_companies)
        AND ucr.is_active = true
    )
  );
END;
$$;

-- Habilitar Row Level Security en la tabla load_stops
ALTER TABLE public.load_stops ENABLE ROW LEVEL SECURITY;

-- Crear política de acceso para load_stops
DROP POLICY IF EXISTS "Load stops access policy" ON public.load_stops;

CREATE POLICY "Load stops access policy" ON public.load_stops
FOR ALL
USING (
  ((select auth.role()) = 'service_role') OR 
  (((select auth.role()) = 'authenticated') AND public.can_access_load(load_id))
)
WITH CHECK (
  ((select auth.role()) = 'service_role') OR 
  (((select auth.role()) = 'authenticated') AND public.can_access_load(load_id))
);