
-- ================================================================
-- 🔧 MIGRACIÓN: Corregir TODAS las deducciones huérfanas
-- ================================================================
-- Esta migración corrige deducciones con payment_period_id NULL o inválido
-- sin importar su fecha de creación
-- ================================================================

DO $$
DECLARE
  deduction_record RECORD;
  correct_payroll_id UUID;
  updated_count INTEGER := 0;
  error_count INTEGER := 0;
BEGIN
  RAISE NOTICE '🔍 Iniciando corrección de TODAS las deducciones huérfanas...';
  
  -- Procesar TODAS las deducciones huérfanas (sin filtro de fecha)
  FOR deduction_record IN 
    SELECT 
      ei.id as deduction_id,
      ei.user_id,
      ei.expense_date,
      ei.payment_period_id as old_period_id,
      ei.description,
      ei.amount
    FROM expense_instances ei
    WHERE 
      -- Deducciones con payment_period_id NULL o que no existe en user_payrolls
      (ei.payment_period_id IS NULL 
       OR NOT EXISTS (
         SELECT 1 FROM user_payrolls up 
         WHERE up.id = ei.payment_period_id
       ))
      AND ei.user_id IS NOT NULL
      AND ei.expense_date IS NOT NULL
    ORDER BY ei.expense_date ASC
  LOOP
    BEGIN
      correct_payroll_id := NULL;
      
      -- Estrategia 1: Si tiene old_period_id que apunta a company_payment_periods
      IF deduction_record.old_period_id IS NOT NULL THEN
        SELECT up.id INTO correct_payroll_id
        FROM user_payrolls up
        WHERE up.user_id = deduction_record.user_id
          AND up.company_payment_period_id = deduction_record.old_period_id
        LIMIT 1;
        
        IF correct_payroll_id IS NOT NULL THEN
          RAISE NOTICE '✅ Estrategia 1: Encontrado payroll % para deducción %', 
            correct_payroll_id, deduction_record.deduction_id;
        END IF;
      END IF;
      
      -- Estrategia 2: Buscar por fecha de la deducción dentro del rango del período
      IF correct_payroll_id IS NULL THEN
        SELECT up.id INTO correct_payroll_id
        FROM user_payrolls up
        JOIN company_payment_periods cpp ON up.company_payment_period_id = cpp.id
        WHERE up.user_id = deduction_record.user_id
          AND deduction_record.expense_date BETWEEN cpp.period_start_date AND cpp.period_end_date
        ORDER BY cpp.period_start_date DESC
        LIMIT 1;
        
        IF correct_payroll_id IS NOT NULL THEN
          RAISE NOTICE '✅ Estrategia 2: Encontrado payroll % para deducción % usando fecha', 
            correct_payroll_id, deduction_record.deduction_id;
        END IF;
      END IF;
      
      -- Estrategia 3: Buscar el período más cercano a la fecha
      IF correct_payroll_id IS NULL THEN
        SELECT up.id INTO correct_payroll_id
        FROM user_payrolls up
        JOIN company_payment_periods cpp ON up.company_payment_period_id = cpp.id
        WHERE up.user_id = deduction_record.user_id
        ORDER BY ABS(EXTRACT(EPOCH FROM (cpp.period_start_date - deduction_record.expense_date)))
        LIMIT 1;
        
        IF correct_payroll_id IS NOT NULL THEN
          RAISE NOTICE '⚠️ Estrategia 3: Encontrado payroll % para deducción % (período más cercano)', 
            correct_payroll_id, deduction_record.deduction_id;
        END IF;
      END IF;
      
      -- Actualizar la deducción si encontramos un payroll válido
      IF correct_payroll_id IS NOT NULL THEN
        UPDATE expense_instances
        SET payment_period_id = correct_payroll_id
        WHERE id = deduction_record.deduction_id;
        
        updated_count := updated_count + 1;
        
        RAISE NOTICE '✅ Actualizada deducción % → payroll % (fecha: %, monto: $%)', 
          deduction_record.deduction_id, correct_payroll_id, 
          deduction_record.expense_date, deduction_record.amount;
      ELSE
        error_count := error_count + 1;
        RAISE NOTICE '❌ No se encontró payroll para deducción % (user: %, fecha: %, desc: %)', 
          deduction_record.deduction_id, deduction_record.user_id, 
          deduction_record.expense_date, deduction_record.description;
      END IF;
      
    EXCEPTION WHEN OTHERS THEN
      error_count := error_count + 1;
      RAISE NOTICE '🚨 Error procesando deducción %: %', 
        deduction_record.deduction_id, SQLERRM;
    END;
  END LOOP;
  
  -- Recalcular los totales de deducciones para TODOS los payrolls afectados
  RAISE NOTICE '🔄 Recalculando totales de deducciones...';
  
  UPDATE user_payrolls up
  SET 
    total_deductions = (
      SELECT COALESCE(SUM(ei.amount), 0)
      FROM expense_instances ei
      WHERE ei.payment_period_id = up.id
    ),
    net_payment = (
      (up.gross_earnings + COALESCE(up.other_income, 0)) - 
      (COALESCE(up.fuel_expenses, 0) + (
        SELECT COALESCE(SUM(ei.amount), 0)
        FROM expense_instances ei
        WHERE ei.payment_period_id = up.id
      ))
    ),
    updated_at = now()
  WHERE EXISTS (
    SELECT 1 FROM expense_instances ei
    WHERE ei.payment_period_id = up.id
  );
  
  -- Resumen final
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ MIGRACIÓN COMPLETADA';
  RAISE NOTICE '========================================';
  RAISE NOTICE '📊 Deducciones actualizadas: %', updated_count;
  RAISE NOTICE '❌ Deducciones sin resolver: %', error_count;
  RAISE NOTICE '========================================';
  
END $$;

-- Verificar resultados
SELECT 
  'Deducciones con NULL' as tipo,
  COUNT(*) as cantidad
FROM expense_instances
WHERE payment_period_id IS NULL
UNION ALL
SELECT 
  'Deducciones asignadas' as tipo,
  COUNT(*) as cantidad
FROM expense_instances
WHERE payment_period_id IS NOT NULL;
