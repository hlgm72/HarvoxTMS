-- Función simplificada para recalcular los gastos de combustible en los cálculos existentes
CREATE OR REPLACE FUNCTION fix_fuel_expenses_separation()
RETURNS void AS $$
DECLARE
    calc_record RECORD;
    period_fuel_total numeric := 0;
BEGIN
    -- Para cada cálculo de período de conductor
    FOR calc_record IN 
        SELECT id, fuel_expenses, total_deductions FROM driver_period_calculations 
        WHERE fuel_expenses = 0 AND total_deductions > 0
        ORDER BY created_at DESC
    LOOP
        -- Calcular total de combustible para este período específico
        SELECT COALESCE(SUM(total_amount), 0) INTO period_fuel_total
        FROM fuel_expenses 
        WHERE payment_period_id = calc_record.id;
        
        -- Si hay gastos de combustible, actualizar el registro
        IF period_fuel_total > 0 THEN
            UPDATE driver_period_calculations 
            SET 
                fuel_expenses = period_fuel_total,
                -- Ajustar las deducciones para que no incluyan combustible
                total_deductions = GREATEST(0, calc_record.total_deductions - period_fuel_total),
                -- Recalcular el pago neto (mantener el valor original si es correcto)
                updated_at = now()
            WHERE id = calc_record.id;
            
            RAISE NOTICE 'Updated period % with fuel_expenses: % and adjusted deductions', calc_record.id, period_fuel_total;
        END IF;
    END LOOP;
    
    RAISE NOTICE 'Completed fuel expenses separation for all periods';
END;
$$ LANGUAGE plpgsql;

-- Ejecutar la corrección
SELECT fix_fuel_expenses_separation();