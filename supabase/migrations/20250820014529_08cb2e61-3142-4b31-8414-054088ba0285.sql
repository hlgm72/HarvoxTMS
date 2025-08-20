-- 1. Corregir función con search_path mutable
-- Agregar SET search_path a la función update_user_preferences_updated_at para seguridad

CREATE OR REPLACE FUNCTION public.update_user_preferences_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'  -- Fijar search_path por seguridad
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 2. Corregir políticas RLS que permiten acceso anónimo en user_preferences
-- Eliminar políticas existentes que permiten acceso anónimo
DROP POLICY IF EXISTS "Users can view their own preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "Users can update their own preferences" ON public.user_preferences;

-- Crear nuevas políticas que requieren autenticación no-anónima
CREATE POLICY "Authenticated users can view their own preferences" 
ON public.user_preferences 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL 
  AND COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false 
  AND user_id = auth.uid()
);

CREATE POLICY "Authenticated users can update their own preferences" 
ON public.user_preferences 
FOR UPDATE 
USING (
  auth.uid() IS NOT NULL 
  AND COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false 
  AND user_id = auth.uid()
)
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false 
  AND user_id = auth.uid()
);

CREATE POLICY "Authenticated users can insert their own preferences" 
ON public.user_preferences 
FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false 
  AND user_id = auth.uid()
);

-- Comentarios explicativos
COMMENT ON FUNCTION public.update_user_preferences_updated_at() IS 
'Trigger function to update updated_at timestamp - secured with fixed search_path';

COMMENT ON POLICY "Authenticated users can view their own preferences" ON public.user_preferences IS 
'Only authenticated non-anonymous users can view their own preferences';