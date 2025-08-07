-- Fix the calculate_driver_payment_period function to use correct column names for other_income
CREATE OR REPLACE FUNCTION public.calculate_driver_payment_period(period_calculation_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    calculation_record driver_period_calculations%ROWTYPE;
    load_record RECORD;
    total_gross_earnings numeric := 0;
    total_other_income numeric := 0;
    total_fuel_expenses numeric := 0;
    total_deductions_amount numeric := 0;
    net_payment numeric := 0;
    has_negative boolean := false;
    alert_msg text := '';
BEGIN
    -- Get the calculation record
    SELECT * INTO calculation_record
    FROM driver_period_calculations
    WHERE id = period_calculation_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Payment period calculation not found';
    END IF;
    
    -- PASO 1: Limpiar deducciones automáticas existentes para evitar duplicados
    DELETE FROM expense_instances 
    WHERE payment_period_id = period_calculation_id
    AND expense_type_id IN (
      SELECT id FROM expense_types 
      WHERE name IN ('Leasing Fee', 'Factoring Fee', 'Dispatching Fee')
    );
    
    -- PASO 2: Calcular ingresos brutos de cargas completadas
    SELECT COALESCE(SUM(total_amount), 0) INTO total_gross_earnings
    FROM loads l
    WHERE l.driver_user_id = calculation_record.driver_user_id
    AND l.payment_period_id = calculation_record.company_payment_period_id
    AND l.status = 'completed';
    
    -- PASO 3: Generar deducciones automáticas basadas en los porcentajes de las cargas
    PERFORM generate_load_percentage_deductions(null, period_calculation_id);
    
    -- PASO 4: Calcular gastos de combustible
    SELECT COALESCE(SUM(total_amount), 0) INTO total_fuel_expenses
    FROM fuel_expenses fe
    WHERE fe.driver_user_id = calculation_record.driver_user_id
    AND fe.payment_period_id = period_calculation_id;
    
    -- PASO 5: Calcular total de deducciones
    SELECT COALESCE(SUM(amount), 0) INTO total_deductions_amount
    FROM expense_instances ei
    WHERE ei.user_id = calculation_record.driver_user_id
    AND ei.payment_period_id = period_calculation_id
    AND ei.status = 'applied';
    
    -- PASO 6: Calcular otros ingresos (FIXED: use user_id instead of driver_user_id)
    SELECT COALESCE(SUM(amount), 0) INTO total_other_income
    FROM other_income oi
    WHERE oi.user_id = calculation_record.driver_user_id
    AND oi.payment_period_id = period_calculation_id
    AND oi.status = 'approved';
    
    -- PASO 7: Calcular pago neto y verificar balance negativo
    net_payment := total_gross_earnings + total_other_income - total_fuel_expenses - total_deductions_amount;
    has_negative := net_payment < 0;
    
    -- PASO 8: Generar mensaje de alerta si hay balance negativo
    IF has_negative THEN
        alert_msg := format('Balance negativo: El conductor debe $%.2f', ABS(net_payment));
    END IF;
    
    -- PASO 9: Actualizar el registro de cálculo
    UPDATE driver_period_calculations
    SET 
        gross_earnings = total_gross_earnings,
        fuel_expenses = total_fuel_expenses,
        total_deductions = total_deductions_amount,
        other_income = total_other_income,
        total_income = total_gross_earnings + total_other_income,
        net_payment = net_payment,
        has_negative_balance = has_negative,
        balance_alert_message = CASE WHEN has_negative THEN alert_msg ELSE NULL END,
        calculated_at = now(),
        calculated_by = auth.uid(),
        updated_at = now()
    WHERE id = period_calculation_id;
    
    -- PASO 10: Retornar resumen del cálculo
    RETURN jsonb_build_object(
        'success', true,
        'period_calculation_id', period_calculation_id,
        'driver_user_id', calculation_record.driver_user_id,
        'totals', jsonb_build_object(
            'gross_earnings', total_gross_earnings,
            'other_income', total_other_income,
            'fuel_expenses', total_fuel_expenses,
            'total_deductions', total_deductions_amount,
            'net_payment', net_payment,
            'has_negative_balance', has_negative
        ),
        'message', CASE 
            WHEN has_negative THEN alert_msg
            ELSE 'Calculation completed successfully'
        END
    );
END;
$function$;