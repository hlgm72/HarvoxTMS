-- 🧹 LIMPIEZA DE PERÍODOS RESIDUALES VACÍOS
-- Eliminar períodos completamente vacíos que quedaron del sistema anterior

-- Función para limpiar períodos residuales vacíos (no solo de hoy)
CREATE OR REPLACE FUNCTION public.cleanup_empty_legacy_periods()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  deleted_count INTEGER := 0;
  period_record RECORD;
BEGIN
  -- Buscar períodos completamente vacíos creados ANTES del 31 de agosto (correcciones)
  FOR period_record IN 
    SELECT cpp.id, cpp.period_start_date, cpp.period_end_date, cpp.company_id, cpp.created_at
    FROM company_payment_periods cpp
    WHERE cpp.created_at < '2025-08-31 17:00:00'  -- Antes de las correcciones
    AND cpp.status = 'open'
    AND NOT EXISTS (
      -- No tiene loads
      SELECT 1 FROM loads l 
      JOIN driver_period_calculations dpc ON l.payment_period_id = dpc.id
      WHERE dpc.company_payment_period_id = cpp.id
    )
    AND NOT EXISTS (
      -- No tiene expense_instances
      SELECT 1 FROM expense_instances ei 
      JOIN driver_period_calculations dpc ON ei.payment_period_id = dpc.id
      WHERE dpc.company_payment_period_id = cpp.id
    )
    AND NOT EXISTS (
      -- No tiene calculations con valores > 0
      SELECT 1 FROM driver_period_calculations dpc 
      WHERE dpc.company_payment_period_id = cpp.id
      AND (dpc.gross_earnings > 0 OR dpc.fuel_expenses > 0 OR dpc.total_deductions > 0 OR dpc.other_income > 0)
    )
  LOOP
    -- Eliminar calculations vacíos primero
    DELETE FROM driver_period_calculations 
    WHERE company_payment_period_id = period_record.id;
    
    -- Eliminar el período residual
    DELETE FROM company_payment_periods 
    WHERE id = period_record.id;
    
    deleted_count := deleted_count + 1;
    
    RAISE LOG 'cleanup_empty_legacy_periods: Deleted legacy empty period % (% to %) for company %, created on %', 
      period_record.id, period_record.period_start_date, period_record.period_end_date, 
      period_record.company_id, period_record.created_at;
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', true,
    'deleted_legacy_periods', deleted_count,
    'message', 'Períodos residuales vacíos eliminados exitosamente',
    'cleaned_at', now(),
    'explanation', 'Eliminados períodos completamente vacíos creados antes del 31 de agosto (sistema anterior)'
  );
END;
$$;

-- Ejecutar limpieza de períodos residuales
SELECT public.cleanup_empty_legacy_periods();