-- Arreglar la política RLS de load_stops para permitir insertar paradas
-- cuando el usuario tiene permisos sobre la carga, incluso si no tiene driver asignado

DROP POLICY IF EXISTS "Load stops simple policy" ON public.load_stops;

-- Crear una política que funcione correctamente
CREATE POLICY "Load stops access policy" ON public.load_stops
  FOR ALL
  USING (
    auth.role() = 'service_role' OR (
      auth.role() = 'authenticated' AND
      load_id IN (
        SELECT l.id 
        FROM public.loads l
        JOIN public.user_company_roles ucr ON (
          -- Si la carga tiene conductor, debe ser del mismo usuario o compañía
          (l.driver_user_id = ucr.user_id AND ucr.user_id = auth.uid()) OR
          -- Si la carga no tiene conductor, el usuario debe tener permisos en la compañía del creador
          (l.driver_user_id IS NULL AND l.created_by IN (
            SELECT ucr2.user_id 
            FROM public.user_company_roles ucr2 
            WHERE ucr2.company_id = ucr.company_id AND ucr2.is_active = true
          ))
        )
        WHERE ucr.user_id = auth.uid() AND ucr.is_active = true
      )
    )
  )
  WITH CHECK (
    auth.role() = 'service_role' OR (
      auth.role() = 'authenticated' AND
      load_id IN (
        SELECT l.id 
        FROM public.loads l
        JOIN public.user_company_roles ucr ON (
          -- Mismo criterio para insertar
          (l.driver_user_id = ucr.user_id AND ucr.user_id = auth.uid()) OR
          (l.driver_user_id IS NULL AND l.created_by IN (
            SELECT ucr2.user_id 
            FROM public.user_company_roles ucr2 
            WHERE ucr2.company_id = ucr.company_id AND ucr2.is_active = true
          ))
        )
        WHERE ucr.user_id = auth.uid() AND ucr.is_active = true
      )
    )
  );