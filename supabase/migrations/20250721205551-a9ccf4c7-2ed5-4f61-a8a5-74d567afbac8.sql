-- Habilitar Row Level Security en la tabla load_stops
ALTER TABLE public.load_stops ENABLE ROW LEVEL SECURITY;

-- Crear política de acceso para load_stops usando la función existente can_access_load
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