-- Función corregida para separar gastos de combustible usando la relación correcta
CREATE OR REPLACE FUNCTION fix_fuel_expenses_separation_v2()
RETURNS void AS $$
DECLARE
    calc_record RECORD;
    period_fuel_total numeric := 0;
BEGIN
    -- Para cada cálculo de período de conductor
    FOR calc_record IN 
        SELECT 
            dpc.id, 
            dpc.driver_user_id,
            dpc.company_payment_period_id,
            dpc.fuel_expenses, 
            dpc.total_deductions 
        FROM driver_period_calculations dpc
        WHERE dpc.fuel_expenses = 0 AND dpc.total_deductions > 0
        ORDER BY dpc.created_at DESC
    LOOP
        -- Calcular total de combustible para este conductor en este período de compañía
        SELECT COALESCE(SUM(fe.total_amount), 0) INTO period_fuel_total
        FROM fuel_expenses fe
        WHERE fe.payment_period_id = calc_record.company_payment_period_id
        AND fe.driver_user_id = calc_record.driver_user_id;
        
        -- Si hay gastos de combustible, actualizar el registro
        IF period_fuel_total > 0 THEN
            UPDATE driver_period_calculations 
            SET 
                fuel_expenses = period_fuel_total,
                -- Ajustar las deducciones para que no incluyan combustible
                total_deductions = GREATEST(0, calc_record.total_deductions - period_fuel_total),
                updated_at = now()
            WHERE id = calc_record.id;
            
            RAISE NOTICE 'Updated period % (driver %) with fuel_expenses: % and adjusted deductions to: %', 
                calc_record.id, calc_record.driver_user_id, period_fuel_total, 
                GREATEST(0, calc_record.total_deductions - period_fuel_total);
        END IF;
    END LOOP;
    
    RAISE NOTICE 'Completed fuel expenses separation v2 for all periods';
END;
$$ LANGUAGE plpgsql;

-- Ejecutar la corrección
SELECT fix_fuel_expenses_separation_v2();