-- Función para recalcular todos los datos históricos de períodos de pago
CREATE OR REPLACE FUNCTION recalculate_all_historical_periods()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  period_record RECORD;
  driver_record RECORD;
  calculations_created INTEGER := 0;
  calculations_updated INTEGER := 0;
  periods_processed INTEGER := 0;
BEGIN
  -- Procesar todos los períodos de pago de empresas
  FOR period_record IN 
    SELECT id, company_id, period_start_date, period_end_date
    FROM company_payment_periods
    WHERE is_locked = false -- Solo períodos no bloqueados
    ORDER BY period_start_date
  LOOP
    periods_processed := periods_processed + 1;
    
    -- Encontrar todos los conductores que tienen datos en este período
    FOR driver_record IN 
      SELECT DISTINCT driver_user_id
      FROM (
        -- Conductores con cargas en este período
        SELECT l.driver_user_id
        FROM loads l
        WHERE l.payment_period_id IN (
          SELECT dpc.id FROM driver_period_calculations dpc 
          WHERE dpc.company_payment_period_id = period_record.id
        )
        
        UNION
        
        -- Conductores con gastos de combustible en este período  
        SELECT fe.driver_user_id
        FROM fuel_expenses fe
        WHERE fe.payment_period_id IN (
          SELECT dpc.id FROM driver_period_calculations dpc 
          WHERE dpc.company_payment_period_id = period_record.id
        )
        
        UNION
        
        -- Conductores con otros ingresos en este período
        SELECT oi.driver_user_id
        FROM other_income oi
        WHERE oi.payment_period_id IN (
          SELECT dpc.id FROM driver_period_calculations dpc 
          WHERE dpc.company_payment_period_id = period_record.id
        )
        
        UNION
        
        -- Conductores activos de la empresa (para gastos/deducciones)
        SELECT ucr.user_id as driver_user_id
        FROM user_company_roles ucr
        WHERE ucr.company_id = period_record.company_id
        AND ucr.role = 'driver'
        AND ucr.is_active = true
      ) drivers
    LOOP
      -- Verificar si ya existe el cálculo del conductor
      IF EXISTS (
        SELECT 1 FROM driver_period_calculations dpc
        WHERE dpc.company_payment_period_id = period_record.id
        AND dpc.driver_user_id = driver_record.driver_user_id
      ) THEN
        -- Actualizar el cálculo existente
        UPDATE driver_period_calculations 
        SET 
          gross_earnings = calc.gross_earnings,
          total_deductions = calc.total_deductions,
          other_income = calc.other_income,
          total_income = calc.total_income,
          net_payment = calc.net_payment,
          has_negative_balance = calc.has_negative_balance,
          updated_at = now()
        FROM (
          SELECT * FROM calculate_driver_period_totals(period_record.id, driver_record.driver_user_id)
        ) calc
        WHERE company_payment_period_id = period_record.id
        AND driver_user_id = driver_record.driver_user_id;
        
        calculations_updated := calculations_updated + 1;
      ELSE
        -- Crear nuevo cálculo
        INSERT INTO driver_period_calculations (
          company_payment_period_id,
          driver_user_id,
          gross_earnings,
          total_deductions,
          other_income,
          total_income,
          net_payment,
          has_negative_balance
        )
        SELECT 
          period_record.id,
          driver_record.driver_user_id,
          calc.gross_earnings,
          calc.total_deductions,
          calc.other_income,
          calc.total_income,
          calc.net_payment,
          calc.has_negative_balance
        FROM (
          SELECT * FROM calculate_driver_period_totals(period_record.id, driver_record.driver_user_id)
        ) calc;
        
        calculations_created := calculations_created + 1;
      END IF;
    END LOOP;
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', true,
    'periods_processed', periods_processed,
    'calculations_created', calculations_created,
    'calculations_updated', calculations_updated,
    'message', 'Recálculo histórico completado exitosamente'
  );
END;
$$;