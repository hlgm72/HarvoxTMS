-- Agregar columna fuel_expenses a driver_period_calculations
ALTER TABLE driver_period_calculations 
ADD COLUMN fuel_expenses numeric NOT NULL DEFAULT 0;

-- Actualizar la función de recálculo para separar combustible de deducciones
CREATE OR REPLACE FUNCTION recalculate_payment_period_totals(period_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    period_record RECORD;
    driver_record RECORD;
BEGIN
    -- Obtener información del período
    SELECT * INTO period_record 
    FROM company_payment_periods 
    WHERE id = period_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Payment period not found: %', period_id;
    END IF;
    
    -- Para cada conductor que tenga transacciones en este período
    FOR driver_record IN 
        SELECT DISTINCT driver_user_id 
        FROM (
            SELECT driver_user_id FROM loads 
            WHERE payment_period_id = period_id
            UNION
            SELECT driver_user_id FROM fuel_expenses 
            WHERE payment_period_id = period_id
            UNION
            SELECT driver_user_id FROM other_income 
            WHERE payment_period_id = period_id
            UNION
            SELECT ei.driver_user_id FROM expense_instances ei
            JOIN driver_period_calculations dpc ON ei.payment_period_id = dpc.id
            WHERE dpc.company_payment_period_id = period_id
        ) AS all_drivers
    LOOP
        -- Insertar o actualizar el cálculo del conductor
        INSERT INTO driver_period_calculations (
            company_payment_period_id,
            driver_user_id,
            gross_earnings,
            fuel_expenses,
            total_deductions,
            other_income,
            total_income,
            net_payment,
            has_negative_balance,
            created_at,
            updated_at
        )
        VALUES (
            period_id,
            driver_record.driver_user_id,
            -- Calcular ingresos brutos (loads)
            COALESCE((
                SELECT SUM(total_amount) 
                FROM loads 
                WHERE payment_period_id = period_id 
                  AND driver_user_id = driver_record.driver_user_id
            ), 0),
            -- Calcular gastos de combustible por separado
            COALESCE((
                SELECT SUM(total_amount) 
                FROM fuel_expenses 
                WHERE payment_period_id = period_id 
                  AND driver_user_id = driver_record.driver_user_id
            ), 0),
            -- Calcular solo las deducciones (expense_instances)
            COALESCE((
                SELECT SUM(ei.amount) 
                FROM expense_instances ei
                JOIN driver_period_calculations dpc ON ei.payment_period_id = dpc.id
                WHERE dpc.company_payment_period_id = period_id 
                  AND dpc.driver_user_id = driver_record.driver_user_id
            ), 0),
            -- Calcular otros ingresos
            COALESCE((
                SELECT SUM(amount) 
                FROM other_income 
                WHERE payment_period_id = period_id 
                  AND driver_user_id = driver_record.driver_user_id
            ), 0),
            -- Total income = gross_earnings + other_income
            COALESCE((
                SELECT SUM(total_amount) 
                FROM loads 
                WHERE payment_period_id = period_id 
                  AND driver_user_id = driver_record.driver_user_id
            ), 0) + COALESCE((
                SELECT SUM(amount) 
                FROM other_income 
                WHERE payment_period_id = period_id 
                  AND driver_user_id = driver_record.driver_user_id
            ), 0),
            -- Net payment = total_income - fuel_expenses - total_deductions
            (COALESCE((
                SELECT SUM(total_amount) 
                FROM loads 
                WHERE payment_period_id = period_id 
                  AND driver_user_id = driver_record.driver_user_id
            ), 0) + COALESCE((
                SELECT SUM(amount) 
                FROM other_income 
                WHERE payment_period_id = period_id 
                  AND driver_user_id = driver_record.driver_user_id
            ), 0)) - COALESCE((
                SELECT SUM(total_amount) 
                FROM fuel_expenses 
                WHERE payment_period_id = period_id 
                  AND driver_user_id = driver_record.driver_user_id
            ), 0) - COALESCE((
                SELECT SUM(ei.amount) 
                FROM expense_instances ei
                JOIN driver_period_calculations dpc ON ei.payment_period_id = dpc.id
                WHERE dpc.company_payment_period_id = period_id 
                  AND dpc.driver_user_id = driver_record.driver_user_id
            ), 0),
            -- Has negative balance
            ((COALESCE((
                SELECT SUM(total_amount) 
                FROM loads 
                WHERE payment_period_id = period_id 
                  AND driver_user_id = driver_record.driver_user_id
            ), 0) + COALESCE((
                SELECT SUM(amount) 
                FROM other_income 
                WHERE payment_period_id = period_id 
                  AND driver_user_id = driver_record.driver_user_id
            ), 0)) - COALESCE((
                SELECT SUM(total_amount) 
                FROM fuel_expenses 
                WHERE payment_period_id = period_id 
                  AND driver_user_id = driver_record.driver_user_id
            ), 0) - COALESCE((
                SELECT SUM(ei.amount) 
                FROM expense_instances ei
                JOIN driver_period_calculations dpc ON ei.payment_period_id = dpc.id
                WHERE dpc.company_payment_period_id = period_id 
                  AND dpc.driver_user_id = driver_record.driver_user_id
            ), 0)) < 0,
            now(),
            now()
        )
        ON CONFLICT (company_payment_period_id, driver_user_id) 
        DO UPDATE SET
            gross_earnings = EXCLUDED.gross_earnings,
            fuel_expenses = EXCLUDED.fuel_expenses,
            total_deductions = EXCLUDED.total_deductions,
            other_income = EXCLUDED.other_income,
            total_income = EXCLUDED.total_income,
            net_payment = EXCLUDED.net_payment,
            has_negative_balance = EXCLUDED.has_negative_balance,
            updated_at = now();
    END LOOP;
    
    RAISE NOTICE 'Recalculated totals for payment period %', period_id;
END;
$$;