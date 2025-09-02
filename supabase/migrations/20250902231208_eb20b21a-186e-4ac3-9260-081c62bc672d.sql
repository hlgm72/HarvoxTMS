-- Drop and recreate function to fix ambiguous column reference
DROP FUNCTION IF EXISTS auto_recalculate_driver_payment_period_v2(UUID, UUID);

CREATE OR REPLACE FUNCTION auto_recalculate_driver_payment_period_v2(
  target_driver_user_id UUID,
  target_company_payment_period_id UUID
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  driver_calculation_record RECORD;
  total_gross_earnings NUMERIC := 0;
  total_fuel_expenses NUMERIC := 0;
  total_other_income NUMERIC := 0;
  total_manual_deductions NUMERIC := 0;
  calculated_total_income NUMERIC := 0;
  calculated_net_payment NUMERIC := 0;
  has_negative_balance BOOLEAN := false;
  upsert_result JSONB;
  load_record RECORD;
  deduction_record RECORD;
BEGIN
  RAISE LOG '🔄 v2.4-UPSERT: Iniciando recálculo con UPSERT para conductor % en período %', 
    target_driver_user_id, target_company_payment_period_id;

  -- 1. Get existing calculation record or initialize with zeros
  SELECT dpc.* INTO driver_calculation_record
  FROM driver_period_calculations dpc
  WHERE dpc.driver_user_id = target_driver_user_id
    AND dpc.company_payment_period_id = target_company_payment_period_id;

  -- 2. Calculate LOADS income with explicit table aliases to fix ambiguity
  SELECT 
    COALESCE(SUM(l.total_amount), 0),
    COALESCE(SUM(l.other_income), 0)
  INTO total_gross_earnings, total_other_income
  FROM loads l
  JOIN company_payment_periods cpp ON l.payment_period_id = cpp.id
  WHERE l.driver_user_id = target_driver_user_id
    AND cpp.id = target_company_payment_period_id
    AND l.status = 'delivered';

  -- 3. Calculate fuel expenses
  SELECT COALESCE(SUM(fe.total_amount), 0) INTO total_fuel_expenses
  FROM fuel_expenses fe
  JOIN company_payment_periods cpp ON fe.payment_period_id = cpp.id
  WHERE fe.driver_user_id = target_driver_user_id
    AND cpp.id = target_company_payment_period_id;

  -- 4. Calculate manual deductions
  SELECT COALESCE(SUM(ei.amount), 0) INTO total_manual_deductions
  FROM expense_instances ei
  JOIN driver_period_calculations dpc ON ei.payment_period_id = dpc.id
  JOIN expense_types et ON ei.expense_type_id = et.id
  WHERE dpc.driver_user_id = target_driver_user_id
    AND dpc.company_payment_period_id = target_company_payment_period_id
    AND et.category = 'manual_deduction'
    AND ei.status = 'applied';

  -- 5. Calculate totals
  calculated_total_income := total_gross_earnings + total_other_income;
  calculated_net_payment := calculated_total_income - total_fuel_expenses - total_manual_deductions;
  has_negative_balance := calculated_net_payment < 0;

  -- 6. UPSERT driver calculation record
  INSERT INTO driver_period_calculations (
    driver_user_id,
    company_payment_period_id,
    gross_earnings,
    other_income,
    fuel_expenses,
    total_deductions,
    total_income,
    net_payment,
    has_negative_balance,
    payment_status,
    calculated_at,
    calculated_by
  ) VALUES (
    target_driver_user_id,
    target_company_payment_period_id,
    total_gross_earnings,
    total_other_income,
    total_fuel_expenses,
    total_manual_deductions,
    calculated_total_income,
    calculated_net_payment,
    has_negative_balance,
    COALESCE(driver_calculation_record.payment_status, 'calculated'),
    now(),
    auth.uid()
  )
  ON CONFLICT (driver_user_id, company_payment_period_id) 
  DO UPDATE SET
    gross_earnings = EXCLUDED.gross_earnings,
    other_income = EXCLUDED.other_income,
    fuel_expenses = EXCLUDED.fuel_expenses,
    total_deductions = EXCLUDED.total_deductions,
    total_income = EXCLUDED.total_income,
    net_payment = EXCLUDED.net_payment,
    has_negative_balance = EXCLUDED.has_negative_balance,
    calculated_at = EXCLUDED.calculated_at,
    calculated_by = EXCLUDED.calculated_by,
    updated_at = now();

  -- 7. Process automatic deductions (percentage-based) with UPSERT approach
  FOR load_record IN
    SELECT l.id, l.total_amount
    FROM loads l
    JOIN company_payment_periods cpp ON l.payment_period_id = cpp.id
    WHERE l.driver_user_id = target_driver_user_id
      AND cpp.id = target_company_payment_period_id
      AND l.status = 'delivered'
      AND l.total_amount > 0
  LOOP
    -- Process percentage deductions for this load
    FOR deduction_record IN
      SELECT et.id as expense_type_id, et.name, et.default_percentage
      FROM expense_types et
      WHERE et.category = 'percentage_deduction'
        AND et.is_active = true
        AND et.default_percentage > 0
    LOOP
      -- UPSERT automatic deduction
      INSERT INTO expense_instances (
        payment_period_id,
        user_id,
        expense_type_id,
        amount,
        description,
        expense_date,
        status,
        applied_at,
        applied_by,
        notes
      ) VALUES (
        (SELECT dpc.id FROM driver_period_calculations dpc 
         WHERE dpc.driver_user_id = target_driver_user_id 
           AND dpc.company_payment_period_id = target_company_payment_period_id),
        target_driver_user_id,
        deduction_record.expense_type_id,
        ROUND((load_record.total_amount * deduction_record.default_percentage / 100), 2),
        'Deducción automática por carga #' || load_record.id,
        CURRENT_DATE,
        'applied',
        now(),
        auth.uid(),
        'Generada automáticamente - Carga: $' || load_record.total_amount || ' × ' || deduction_record.default_percentage || '%'
      )
      ON CONFLICT (payment_period_id, expense_type_id, user_id)
      DO UPDATE SET
        amount = expense_instances.amount + EXCLUDED.amount,
        description = 'Deducción acumulada automática (' || deduction_record.name || ')',
        notes = 'Múltiples cargas procesadas - Total acumulado',
        updated_at = now();

    END LOOP;
  END LOOP;

  -- 8. Final recalculation with deductions
  SELECT COALESCE(SUM(ei.amount), 0) INTO total_manual_deductions
  FROM expense_instances ei
  JOIN driver_period_calculations dpc ON ei.payment_period_id = dpc.id
  WHERE dpc.driver_user_id = target_driver_user_id
    AND dpc.company_payment_period_id = target_company_payment_period_id
    AND ei.status = 'applied';

  calculated_net_payment := calculated_total_income - total_fuel_expenses - total_manual_deductions;
  has_negative_balance := calculated_net_payment < 0;

  -- 9. Final update
  UPDATE driver_period_calculations dpc SET
    total_deductions = total_manual_deductions,
    net_payment = calculated_net_payment,
    has_negative_balance = has_negative_balance,
    updated_at = now()
  WHERE dpc.driver_user_id = target_driver_user_id
    AND dpc.company_payment_period_id = target_company_payment_period_id;

  RETURN jsonb_build_object(
    'success', true,
    'driver_user_id', target_driver_user_id,
    'period_id', target_company_payment_period_id,
    'calculations', jsonb_build_object(
      'gross_earnings', total_gross_earnings,
      'other_income', total_other_income,
      'fuel_expenses', total_fuel_expenses,
      'total_deductions', total_manual_deductions,
      'total_income', calculated_total_income,
      'net_payment', calculated_net_payment,
      'has_negative_balance', has_negative_balance
    )
  );

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Error en recálculo v2.4-UPSERT: %', SQLERRM;
END;
$$;