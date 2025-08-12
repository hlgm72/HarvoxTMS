-- Función para actualizar ciudades que están guardadas como UUIDs en load_stops
CREATE OR REPLACE FUNCTION public.fix_city_uuids_in_load_stops()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  updated_count INTEGER := 0;
  stop_record RECORD;
  city_name TEXT;
BEGIN
  -- Buscar todas las paradas que tienen UUIDs en el campo city
  FOR stop_record IN 
    SELECT id, city 
    FROM load_stops 
    WHERE city IS NOT NULL 
    AND city ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  LOOP
    -- Intentar encontrar el nombre de la ciudad usando el UUID
    SELECT name INTO city_name
    FROM cities 
    WHERE id = stop_record.city::uuid;
    
    -- Si encontramos la ciudad, actualizar el registro
    IF city_name IS NOT NULL THEN
      UPDATE load_stops 
      SET city = city_name 
      WHERE id = stop_record.id;
      
      updated_count := updated_count + 1;
      
      RAISE NOTICE 'Updated load_stop % city from UUID % to %', 
        stop_record.id, stop_record.city, city_name;
    ELSE
      RAISE NOTICE 'Could not find city name for UUID % in load_stop %', 
        stop_record.city, stop_record.id;
    END IF;
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', true,
    'updated_count', updated_count,
    'message', format('Updated %s load stops with proper city names', updated_count)
  );
END;
$function$;

-- Ejecutar la función de corrección
SELECT public.fix_city_uuids_in_load_stops();