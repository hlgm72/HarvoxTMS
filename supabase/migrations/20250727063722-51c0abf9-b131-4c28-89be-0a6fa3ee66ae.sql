-- Crear o reemplazar función para calcular correctamente los totales de combustible
CREATE OR REPLACE FUNCTION calculate_driver_period_totals(driver_calc_id uuid)
RETURNS void AS $$
DECLARE
    calc_record RECORD;
    period_fuel_total numeric := 0;
    period_other_deductions_total numeric := 0;
    period_other_income_total numeric := 0;
    period_loads_total numeric := 0;
BEGIN
    -- Obtener el registro del cálculo del conductor
    SELECT * INTO calc_record 
    FROM driver_period_calculations 
    WHERE id = driver_calc_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Driver calculation record not found';
    END IF;
    
    -- Calcular total de combustible para este período
    SELECT COALESCE(SUM(total_amount), 0) INTO period_fuel_total
    FROM fuel_expenses 
    WHERE payment_period_id = driver_calc_id;
    
    -- Calcular otros ingresos para este período
    SELECT COALESCE(SUM(amount), 0) INTO period_other_income_total
    FROM other_income_items 
    WHERE payment_period_id = driver_calc_id;
    
    -- Calcular deducciones (excluyendo combustible) para este período
    SELECT COALESCE(SUM(amount), 0) INTO period_other_deductions_total
    FROM expense_instances 
    WHERE payment_period_id = driver_calc_id;
    
    -- Calcular ingresos brutos de cargas para este período
    SELECT COALESCE(SUM(driver_payment), 0) INTO period_loads_total
    FROM loads l
    JOIN company_payment_periods cpp ON l.company_payment_period_id = cpp.id
    WHERE l.driver_user_id = calc_record.driver_user_id 
    AND l.company_payment_period_id = calc_record.company_payment_period_id;
    
    -- Actualizar el registro con los valores calculados
    UPDATE driver_period_calculations 
    SET 
        gross_earnings = period_loads_total,
        other_income = period_other_income_total,
        fuel_expenses = period_fuel_total,
        total_deductions = period_other_deductions_total,
        total_income = period_loads_total + period_other_income_total,
        net_payment = (period_loads_total + period_other_income_total) - period_fuel_total - period_other_deductions_total,
        has_negative_balance = ((period_loads_total + period_other_income_total) - period_fuel_total - period_other_deductions_total) < 0,
        balance_alert_message = CASE 
            WHEN ((period_loads_total + period_other_income_total) - period_fuel_total - period_other_deductions_total) < 0 
            THEN 'El conductor tiene un balance negativo de $' || ABS((period_loads_total + period_other_income_total) - period_fuel_total - period_other_deductions_total)::text
            ELSE NULL 
        END,
        calculated_at = now()
    WHERE id = driver_calc_id;
END;
$$ LANGUAGE plpgsql;

-- Función para recalcular todos los períodos existentes
CREATE OR REPLACE FUNCTION fix_existing_fuel_calculations()
RETURNS void AS $$
DECLARE
    calc_record RECORD;
BEGIN
    -- Recalcular todos los registros existentes
    FOR calc_record IN 
        SELECT id FROM driver_period_calculations 
        ORDER BY created_at DESC
    LOOP
        PERFORM calculate_driver_period_totals(calc_record.id);
    END LOOP;
    
    RAISE NOTICE 'Recalculados todos los períodos de pago existentes';
END;
$$ LANGUAGE plpgsql;

-- Ejecutar la corrección para los datos existentes
SELECT fix_existing_fuel_calculations();