-- Reset completo de la carga 25-384 a estado inicial (corregido)
DO $$
DECLARE
  target_load_id UUID;
  system_user_id UUID := '00000000-0000-0000-0000-000000000000'::UUID;
BEGIN
  -- Get the load ID for load number 25-384
  SELECT id INTO target_load_id 
  FROM loads 
  WHERE load_number = '25-384';
  
  IF target_load_id IS NOT NULL THEN
    -- 1. Limpiar todo el historial de estados
    DELETE FROM load_status_history 
    WHERE load_id = target_load_id;
    
    -- 2. Resetear el estado de la carga a assigned
    UPDATE loads 
    SET 
      status = 'assigned',
      updated_at = now()
    WHERE id = target_load_id;
    
    -- 3. Limpiar ETAs y notas de todas las paradas (solo campos que existen)
    UPDATE load_stops 
    SET 
      eta_date = NULL,
      eta_time = NULL,
      driver_notes = NULL,
      last_status_update = NULL
    WHERE load_id = target_load_id;
    
    -- 4. Crear un nuevo registro de historial limpio
    INSERT INTO load_status_history (
      load_id,
      previous_status,
      new_status,
      changed_by,
      changed_at,
      notes
    ) VALUES (
      target_load_id,
      NULL,
      'assigned',
      system_user_id,
      now(),
      'Carga reseteada completamente - progreso 0%'
    );
    
    RAISE NOTICE 'Carga 25-384 reseteada completamente: estado assigned, historial limpio, paradas sin ETAs ni notas';
  ELSE
    RAISE NOTICE 'Carga 25-384 no encontrada';
  END IF;
END $$;