-- 🚨 ELIMINACIÓN DEFINITIVA DEL PERÍODO PROBLEMÁTICO SEMANA 36
-- Eliminar período con cálculos vacíos (solo automáticos, sin transacciones reales)

DO $$
DECLARE
  problematic_period_id UUID := '92b2e04b-e4a5-4193-9197-88538055a43a';
  calculations_count INTEGER := 0;
  has_real_data INTEGER := 0;
BEGIN
  -- Verificar que NO hay datos reales (loads, fuel_expenses)
  SELECT 
    (SELECT COUNT(*) FROM loads WHERE payment_period_id = problematic_period_id) +
    (SELECT COUNT(*) FROM fuel_expenses WHERE payment_period_id = problematic_period_id) +
    (SELECT COUNT(*) FROM expense_instances WHERE payment_period_id IS NOT NULL AND payment_period_id IN 
     (SELECT id FROM driver_period_calculations WHERE company_payment_period_id = problematic_period_id))
  INTO has_real_data;
  
  -- Contar los cálculos automáticos
  SELECT COUNT(*) INTO calculations_count
  FROM driver_period_calculations 
  WHERE company_payment_period_id = problematic_period_id;
  
  IF has_real_data = 0 THEN
    -- Eliminar primero los cálculos vacíos automáticos
    DELETE FROM driver_period_calculations 
    WHERE company_payment_period_id = problematic_period_id
    AND gross_earnings = 0 
    AND fuel_expenses = 0 
    AND total_deductions = 0 
    AND other_income = 0;
    
    -- Ahora eliminar el período problemático
    DELETE FROM company_payment_periods 
    WHERE id = problematic_period_id 
    AND period_start_date = '2025-09-01';
    
    RAISE LOG 'CLEANUP SUCCESS: Eliminated problematic period % with % empty calculations', problematic_period_id, calculations_count;
  ELSE
    RAISE LOG 'CLEANUP SKIPPED: Period % has % real data records', problematic_period_id, has_real_data;
  END IF;
END $$;

-- Mensaje final de confirmación
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM company_payment_periods WHERE id = '92b2e04b-e4a5-4193-9197-88538055a43a') 
    THEN 'PERÍODO AÚN EXISTE - Tiene datos reales asociados'
    ELSE 'PERÍODO ELIMINADO EXITOSAMENTE - Problema resuelto'
  END as cleanup_status;