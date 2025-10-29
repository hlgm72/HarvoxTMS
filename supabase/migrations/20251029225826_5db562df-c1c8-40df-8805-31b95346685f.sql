
-- Migración para eliminar carga #25-029
-- Los triggers automáticos se encargarán del recálculo
DO $$
DECLARE
  v_load_id UUID := 'a673299a-3e47-42b1-9ce2-d30143239415';
BEGIN
  -- 1. Eliminar paradas de la carga (por foreign key constraint, deben ir primero)
  DELETE FROM load_stops WHERE load_id = v_load_id;
  RAISE NOTICE '✅ Paradas eliminadas para carga 25-029';
  
  -- 2. Eliminar la carga
  DELETE FROM loads WHERE id = v_load_id;
  RAISE NOTICE '✅ Carga 25-029 eliminada exitosamente';
  
  RAISE NOTICE '✅ Operación completada. Los triggers automáticos recalcularán el payroll.';
END $$;
