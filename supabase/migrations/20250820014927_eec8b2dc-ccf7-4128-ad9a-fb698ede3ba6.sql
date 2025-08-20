-- Optimizar políticas RLS de user_preferences para mejor rendimiento

-- 1. Eliminar políticas duplicadas (la vieja que quedó)
DROP POLICY IF EXISTS "Users can insert their own preferences" ON public.user_preferences;

-- 2. Recrear las políticas optimizadas usando (select auth.function()) para mejor rendimiento
-- Esto evita que se re-evalúen las funciones auth para cada fila

DROP POLICY IF EXISTS "Authenticated users can view their own preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "Authenticated users can update their own preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "Authenticated users can insert their own preferences" ON public.user_preferences;

-- 3. Crear políticas optimizadas con (select auth.function())
CREATE POLICY "Authenticated users can view their own preferences" 
ON public.user_preferences 
FOR SELECT 
USING (
  (SELECT auth.uid()) IS NOT NULL 
  AND COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false 
  AND user_id = (SELECT auth.uid())
);

CREATE POLICY "Authenticated users can update their own preferences" 
ON public.user_preferences 
FOR UPDATE 
USING (
  (SELECT auth.uid()) IS NOT NULL 
  AND COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false 
  AND user_id = (SELECT auth.uid())
)
WITH CHECK (
  (SELECT auth.uid()) IS NOT NULL 
  AND COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false 
  AND user_id = (SELECT auth.uid())
);

CREATE POLICY "Authenticated users can insert their own preferences" 
ON public.user_preferences 
FOR INSERT 
WITH CHECK (
  (SELECT auth.uid()) IS NOT NULL 
  AND COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false 
  AND user_id = (SELECT auth.uid())
);

-- Comentarios explicativos sobre la optimización
COMMENT ON POLICY "Authenticated users can view their own preferences" ON public.user_preferences IS 
'Optimized RLS policy using (select auth.function()) to prevent re-evaluation per row';

COMMENT ON POLICY "Authenticated users can update their own preferences" ON public.user_preferences IS 
'Optimized RLS policy using (select auth.function()) to prevent re-evaluation per row';

COMMENT ON POLICY "Authenticated users can insert their own preferences" ON public.user_preferences IS 
'Optimized RLS policy using (select auth.function()) to prevent re-evaluation per row';