-- Arreglar el cálculo de combustible en calculate_driver_payment_period_with_validation
-- El problema es que está filtrando por status = 'approved' pero los gastos de combustible podrían tener otros status

CREATE OR REPLACE FUNCTION public.calculate_driver_payment_period_with_validation(calculation_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  current_user_id UUID;
  calculation_record RECORD;
  calculated_gross_earnings NUMERIC := 0;
  calculated_other_income NUMERIC := 0;
  calculated_fuel_expenses NUMERIC := 0;
  calculated_total_deductions NUMERIC := 0;
  calculated_total_income NUMERIC := 0;
  calculated_net_payment NUMERIC := 0;  -- Renamed from net_payment to avoid ambiguity
  calculated_has_negative_balance BOOLEAN := false;
  period_start_date DATE;
  period_end_date DATE;
  target_company_id UUID;
BEGIN
  -- Get current authenticated user
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  -- Get calculation record
  SELECT * INTO calculation_record
  FROM driver_period_calculations dpc
  WHERE dpc.id = calculation_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cálculo no encontrado';
  END IF;

  -- Get period dates and company_id
  SELECT 
    cpp.period_start_date,
    cpp.period_end_date,
    cpp.company_id
  INTO period_start_date, period_end_date, target_company_id
  FROM company_payment_periods cpp
  WHERE cpp.id = calculation_record.company_payment_period_id;

  -- ================================
  -- 1. VALIDATE PERMISSIONS
  -- ================================
  IF NOT EXISTS (
    SELECT 1 FROM user_company_roles
    WHERE user_id = current_user_id
    AND company_id = target_company_id
    AND role IN ('company_owner', 'operations_manager', 'superadmin')
    AND is_active = true
  ) AND current_user_id != calculation_record.driver_user_id THEN
    RAISE EXCEPTION 'Sin permisos para calcular este período de pago';
  END IF;

  -- ================================
  -- 2. CALCULATE GROSS EARNINGS (from loads)
  -- ================================
  SELECT COALESCE(SUM(l.total_amount), 0)
  INTO calculated_gross_earnings
  FROM loads l
  WHERE l.driver_user_id = calculation_record.driver_user_id
  AND l.payment_period_id = calculation_record.company_payment_period_id
  AND l.status = 'completed';

  -- ================================
  -- 3. CALCULATE OTHER INCOME (bonus, additional payments)
  -- Fixed: Use user_id instead of driver_user_id for other_income table
  -- ================================
  SELECT COALESCE(SUM(oi.amount), 0)
  INTO calculated_other_income
  FROM other_income oi
  WHERE oi.user_id = calculation_record.driver_user_id
  AND oi.payment_period_id = calculation_record.company_payment_period_id
  AND oi.status IN ('approved', 'pending');

  -- ================================
  -- 4. CALCULATE FUEL EXPENSES - 🚨 FIX CRÍTICO
  -- ================================
  -- Cambiar el filtro de status para incluir todos los gastos válidos
  SELECT COALESCE(SUM(fe.total_amount), 0)
  INTO calculated_fuel_expenses
  FROM fuel_expenses fe
  WHERE fe.driver_user_id = calculation_record.driver_user_id
  AND fe.payment_period_id = calculation_record.company_payment_period_id
  AND fe.status IN ('approved', 'pending', 'verified'); -- 🚨 FIX: Incluir más status

  -- Log para debug
  RAISE NOTICE '🔍 Fuel Debug - Driver: %, Period: %, Total: %', 
    calculation_record.driver_user_id, 
    calculation_record.company_payment_period_id,
    calculated_fuel_expenses;

  -- ================================
  -- 5. CALCULATE TOTAL DEDUCTIONS (expense instances)
  -- ================================
  SELECT COALESCE(SUM(ei.amount), 0)
  INTO calculated_total_deductions
  FROM expense_instances ei
  WHERE ei.payment_period_id = calculation_id
  AND ei.status = 'applied';

  -- Generate automatic deductions from load percentages
  PERFORM generate_load_percentage_deductions(NULL, calculation_id);

  -- Recalculate deductions after generating percentage-based ones
  SELECT COALESCE(SUM(ei.amount), 0)
  INTO calculated_total_deductions
  FROM expense_instances ei
  WHERE ei.payment_period_id = calculation_id
  AND ei.status = 'applied';

  -- ================================
  -- 6. CALCULATE TOTALS
  -- ================================
  calculated_total_income := calculated_gross_earnings + calculated_other_income;
  calculated_net_payment := calculated_total_income - calculated_fuel_expenses - calculated_total_deductions;
  calculated_has_negative_balance := calculated_net_payment < 0;

  -- ================================
  -- 7. UPDATE CALCULATION RECORD
  -- ================================
  UPDATE driver_period_calculations
  SET
    gross_earnings = calculated_gross_earnings,
    other_income = calculated_other_income,
    fuel_expenses = calculated_fuel_expenses,
    total_deductions = calculated_total_deductions,
    total_income = calculated_total_income,
    net_payment = calculated_net_payment,
    has_negative_balance = calculated_has_negative_balance,
    calculated_by = current_user_id,
    calculated_at = now(),
    updated_at = now(),
    balance_alert_message = CASE 
      WHEN calculated_has_negative_balance THEN 
        'Saldo negativo: $' || ABS(calculated_net_payment)::TEXT || ' - Revisar deducciones'
      ELSE NULL
    END
  WHERE id = calculation_id;

  -- ================================
  -- 8. TRIGGER PERIOD TOTALS RECALCULATION
  -- ================================
  PERFORM recalculate_payment_period_totals(calculation_record.company_payment_period_id);

  -- Return success result
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Cálculo de período actualizado exitosamente',
    'calculation_id', calculation_id,
    'driver_user_id', calculation_record.driver_user_id,
    'period_dates', jsonb_build_object(
      'start', period_start_date,
      'end', period_end_date
    ),
    'financial_summary', jsonb_build_object(
      'gross_earnings', calculated_gross_earnings,
      'other_income', calculated_other_income,
      'total_income', calculated_total_income,
      'fuel_expenses', calculated_fuel_expenses,
      'total_deductions', calculated_total_deductions,
      'net_payment', calculated_net_payment,
      'has_negative_balance', calculated_has_negative_balance
    ),
    'calculated_by', current_user_id,
    'calculated_at', now()
  );

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Error en cálculo ACID del período: %', SQLERRM;
END;
$function$;