-- Eliminar políticas duplicadas en la tabla profiles

-- Eliminar todas las políticas antiguas que están causando conflictos
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_policy" ON public.profiles;

-- Verificar que las políticas actuales son las únicas que quedan
-- Las políticas correctas ya están creadas:
-- - "Authenticated users can view company profiles" (SELECT)
-- - "Authenticated users can insert their own profile" (INSERT) 
-- - "Authenticated users can update their own profile" (UPDATE)
-- - "Authenticated users can delete their own profile" (DELETE)