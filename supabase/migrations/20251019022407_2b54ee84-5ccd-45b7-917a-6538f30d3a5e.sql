-- ============================================================================
-- MIGRACIÓN: Corregir referencias a columnas inexistentes en company_payment_periods
-- ============================================================================
-- Problema: Las funciones están usando cpp.is_locked y cpp.status que no existen
-- Solución: Eliminar estas referencias de todas las funciones

-- ============================================================================
-- 1. Corregir cleanup_unnecessary_periods_created_today
-- ============================================================================
CREATE OR REPLACE FUNCTION public.cleanup_unnecessary_periods_created_today()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  deleted_count INTEGER := 0;
  period_record RECORD;
BEGIN
  FOR period_record IN 
    SELECT cpp.id, cpp.period_start_date, cpp.period_end_date, cpp.company_id
    FROM company_payment_periods cpp
    WHERE DATE(cpp.created_at) = CURRENT_DATE
    -- ✅ REMOVIDO: cpp.status = 'open' (columna no existe)
    AND NOT EXISTS (
      SELECT 1 FROM loads l WHERE l.payment_period_id = cpp.id
    )
    AND NOT EXISTS (
      SELECT 1 FROM fuel_expenses fe WHERE fe.payment_period_id = cpp.id
    )
    AND NOT EXISTS (
      SELECT 1 FROM expense_instances ei 
      WHERE ei.payment_period_id IN (
        SELECT up.id FROM user_payrolls up 
        WHERE up.company_payment_period_id = cpp.id
      )
    )
    AND NOT EXISTS (
      SELECT 1 FROM user_payrolls up 
      WHERE up.company_payment_period_id = cpp.id
      AND (up.gross_earnings > 0 OR up.fuel_expenses > 0 OR up.total_deductions > 0)
    )
  LOOP
    DELETE FROM user_payrolls 
    WHERE company_payment_period_id = period_record.id;
    
    DELETE FROM company_payment_periods 
    WHERE id = period_record.id;
    
    deleted_count := deleted_count + 1;
    
    RAISE LOG 'cleanup_unnecessary_periods: Deleted empty period % (% to %) for company %', 
      period_record.id, period_record.period_start_date, period_record.period_end_date, period_record.company_id;
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', true,
    'deleted_periods', deleted_count,
    'message', 'Períodos innecesarios eliminados exitosamente',
    'cleaned_at', now()
  );
END;
$function$;

-- ============================================================================
-- 2. Verificar que is_payment_period_locked devuelva siempre false
-- ============================================================================
CREATE OR REPLACE FUNCTION public.is_payment_period_locked(target_period_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  -- Siempre devuelve false ya que no existe la columna is_locked
  SELECT false;
$function$;