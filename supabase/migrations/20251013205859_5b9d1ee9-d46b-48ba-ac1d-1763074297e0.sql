
-- ================================================================
-- 🔧 MIGRACIÓN CORREGIDA: Asignar company_payment_period_id
-- ================================================================

DO $$
DECLARE
  updated_count INTEGER := 0;
  deleted_count INTEGER := 0;
BEGIN
  RAISE NOTICE '🔍 Corrigiendo deducciones huérfanas...';
  
  -- Paso 1: Eliminar duplicados
  WITH ranked_deductions AS (
    SELECT 
      ei.id,
      ROW_NUMBER() OVER (
        PARTITION BY ei.user_id, ei.expense_type_id, cpp.id 
        ORDER BY ei.created_at DESC
      ) as rn
    FROM expense_instances ei
    JOIN company_payment_periods cpp ON ei.expense_date BETWEEN cpp.period_start_date AND cpp.period_end_date
    JOIN user_payrolls up ON up.company_payment_period_id = cpp.id AND up.user_id = ei.user_id
    WHERE ei.payment_period_id IS NULL
      AND ei.user_id IS NOT NULL
      AND ei.expense_date IS NOT NULL
  )
  DELETE FROM expense_instances
  WHERE id IN (
    SELECT id FROM ranked_deductions WHERE rn > 1
  );
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE '✅ Duplicados eliminados: %', deleted_count;
  
  -- Paso 2: Actualizar con company_payment_period_id correcto
  WITH deduction_updates AS (
    SELECT DISTINCT ON (ei.id)
      ei.id as deduction_id,
      cpp.id as correct_period_id
    FROM expense_instances ei
    JOIN company_payment_periods cpp ON ei.expense_date BETWEEN cpp.period_start_date AND cpp.period_end_date
    JOIN user_payrolls up ON up.company_payment_period_id = cpp.id AND up.user_id = ei.user_id
    WHERE ei.payment_period_id IS NULL
      AND ei.user_id IS NOT NULL
      AND ei.expense_date IS NOT NULL
    ORDER BY ei.id, cpp.period_start_date DESC
  )
  UPDATE expense_instances ei
  SET payment_period_id = du.correct_period_id
  FROM deduction_updates du
  WHERE ei.id = du.deduction_id;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE '✅ Deducciones actualizadas: %', updated_count;
  
  -- Recalcular totales de user_payrolls
  UPDATE user_payrolls up
  SET 
    total_deductions = (
      SELECT COALESCE(SUM(ei.amount), 0)
      FROM expense_instances ei
      WHERE ei.payment_period_id = up.company_payment_period_id
        AND ei.user_id = up.user_id
    ),
    net_payment = (
      (up.gross_earnings + COALESCE(up.other_income, 0)) - 
      (COALESCE(up.fuel_expenses, 0) + (
        SELECT COALESCE(SUM(ei.amount), 0)
        FROM expense_instances ei
        WHERE ei.payment_period_id = up.company_payment_period_id
          AND ei.user_id = up.user_id
      ))
    ),
    updated_at = now()
  WHERE EXISTS (
    SELECT 1 FROM expense_instances ei
    WHERE ei.payment_period_id = up.company_payment_period_id
      AND ei.user_id = up.user_id
  );
  
  RAISE NOTICE '✅ Completado - Eliminados: %, Actualizados: %', deleted_count, updated_count;
END $$;

-- Verificar específicamente W31/2025 (Diosvani)
SELECT 
  'W31/2025 (Diosvani)' as reporte,
  COUNT(*) as deducciones_count,
  COALESCE(SUM(ei.amount), 0) as total_amount
FROM expense_instances ei
WHERE ei.payment_period_id = '86d4c271-572f-4bdd-be91-7b52ccd3b1b6'
  AND ei.user_id = '484d83b3-b928-46b3-9705-db225ddb9b0c';
