-- Eliminar la versión antigua de simple_load_operation que causa conflicto
DROP FUNCTION IF EXISTS public.simple_load_operation(text, jsonb, jsonb, uuid);

-- Verificar que solo quede la versión correcta
-- La función correcta ya existe con la firma: (text, jsonb, jsonb[], uuid)