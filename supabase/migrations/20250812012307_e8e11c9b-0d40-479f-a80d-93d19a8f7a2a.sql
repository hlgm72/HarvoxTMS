-- Función para corregir las ciudades específicas que vemos en los logs
CREATE OR REPLACE FUNCTION public.fix_specific_city_uuids()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  updated_count INTEGER := 0;
BEGIN
  -- Corregir las ciudades específicas que vemos en los logs
  -- UUID "750b5c34-e64e-493f-bfd6-2e41f640dd6f" parece ser Houston, TX
  UPDATE load_stops 
  SET city = 'Houston' 
  WHERE city = '750b5c34-e64e-493f-bfd6-2e41f640dd6f';
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  
  -- UUID "b0054329-2b61-4899-ba65-3b5e3d19c59f" parece ser Fort Worth, TX (76179)
  UPDATE load_stops 
  SET city = 'Fort Worth' 
  WHERE city = 'b0054329-2b61-4899-ba65-3b5e3d19c59f';
  
  GET DIAGNOSTICS updated_count = updated_count + ROW_COUNT;
  
  -- Buscar otros UUIDs y marcarlos para corrección manual
  UPDATE load_stops 
  SET city = 'Ciudad por verificar' 
  WHERE city ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  AND city NOT IN ('750b5c34-e64e-493f-bfd6-2e41f640dd6f', 'b0054329-2b61-4899-ba65-3b5e3d19c59f');
  
  GET DIAGNOSTICS updated_count = updated_count + ROW_COUNT;
  
  RETURN jsonb_build_object(
    'success', true,
    'updated_count', updated_count,
    'message', format('Corregidas %s paradas con nombres de ciudad apropiados', updated_count)
  );
END;
$function$;

-- Ejecutar la corrección
SELECT public.fix_specific_city_uuids();