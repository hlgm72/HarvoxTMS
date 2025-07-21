-- Buscar y eliminar la política o función que causa la ambigüedad
-- El problema está en las políticas RLS de load_stops que tienen ambigüedad de company_id

-- Primero verificar las políticas actuales de load_stops
SELECT schemaname, tablename, policyname, cmd, permissive, roles, qual, with_check 
FROM pg_policies 
WHERE tablename = 'load_stops';

-- Eliminar cualquier política problemática que pueda causar ambigüedad
DROP POLICY IF EXISTS "Load stops complete policy" ON public.load_stops;
DROP POLICY IF EXISTS "Load stops comprehensive policy" ON public.load_stops;
DROP POLICY IF EXISTS "Load stops access policy" ON public.load_stops;

-- Crear una política simple y clara para load_stops
CREATE POLICY "Load stops simple policy" ON public.load_stops
  FOR ALL
  USING (
    auth.role() = 'service_role' OR (
      auth.role() = 'authenticated' AND
      load_id IN (
        SELECT l.id 
        FROM public.loads l
        JOIN public.user_company_roles ucr ON l.driver_user_id = ucr.user_id
        WHERE ucr.user_id = auth.uid() 
        AND ucr.is_active = true
      )
    )
  )
  WITH CHECK (
    auth.role() = 'service_role' OR (
      auth.role() = 'authenticated' AND
      load_id IN (
        SELECT l.id 
        FROM public.loads l
        JOIN public.user_company_roles ucr ON l.driver_user_id = ucr.user_id
        WHERE ucr.user_id = auth.uid() 
        AND ucr.is_active = true
      )
    )
  );