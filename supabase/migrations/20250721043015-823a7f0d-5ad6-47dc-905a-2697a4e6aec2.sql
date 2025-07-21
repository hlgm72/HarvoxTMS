-- ARREGLAR LA VERDADERA CAUSA: La política RLS tiene ambigüedad de company_id
-- El problema está en ucr2.company_id = ucr.company_id - ambas tablas tienen company_id

DROP POLICY IF EXISTS "Load stops access policy" ON public.load_stops;

-- Crear una política completamente nueva sin ambigüedad
CREATE POLICY "Load stops access policy" ON public.load_stops
  FOR ALL
  USING (
    (SELECT auth.role()) = 'service_role' OR (
      (SELECT auth.role()) = 'authenticated' AND
      load_id IN (
        SELECT l.id 
        FROM public.loads l
        JOIN public.user_company_roles ucr1 ON (
          -- Si la carga tiene conductor asignado
          (l.driver_user_id = ucr1.user_id AND ucr1.user_id = (SELECT auth.uid())) OR
          -- Si la carga no tiene conductor, verificar que el creador esté en la misma empresa
          (l.driver_user_id IS NULL AND l.created_by IN (
            SELECT ucr2.user_id 
            FROM public.user_company_roles ucr2 
            WHERE ucr2.company_id = ucr1.company_id AND ucr2.is_active = true
          ))
        )
        WHERE ucr1.user_id = (SELECT auth.uid()) AND ucr1.is_active = true
      )
    )
  )
  WITH CHECK (
    (SELECT auth.role()) = 'service_role' OR (
      (SELECT auth.role()) = 'authenticated' AND
      load_id IN (
        SELECT l.id 
        FROM public.loads l
        JOIN public.user_company_roles ucr1 ON (
          -- Misma lógica para insertar
          (l.driver_user_id = ucr1.user_id AND ucr1.user_id = (SELECT auth.uid())) OR
          (l.driver_user_id IS NULL AND l.created_by IN (
            SELECT ucr2.user_id 
            FROM public.user_company_roles ucr2 
            WHERE ucr2.company_id = ucr1.company_id AND ucr2.is_active = true
          ))
        )
        WHERE ucr1.user_id = (SELECT auth.uid()) AND ucr1.is_active = true
      )
    )
  );