-- ARREGLAR BUG SISTEMÁTICO: Funciones de recálculo suman cargas incorrectamente
-- Las funciones recalculate_payment_period_totals y verify_and_recalculate_company_payments
-- están sumando 'total_amount' de todas las cargas sin filtrar por status='delivered'
-- y sin usar la lógica correcta de rate_type/driver_rate/rate_percentage

-- 1. Arreglar función recalculate_payment_period_totals
CREATE OR REPLACE FUNCTION public.recalculate_payment_period_totals(period_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    period_record RECORD;
    driver_record RECORD;
    calculated_gross_earnings NUMERIC;
    calculated_fuel_expenses NUMERIC;
    calculated_total_deductions NUMERIC;
    calculated_other_income NUMERIC;
    calculated_net_payment NUMERIC;
    calculated_has_negative_balance BOOLEAN;
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
            SELECT ei.user_id as driver_user_id FROM expense_instances ei
            WHERE ei.payment_period_id = period_id
        ) AS all_drivers
    LOOP
        -- CALCULAR GROSS EARNINGS CORRECTAMENTE: Solo cargas delivered del período específico
        SELECT COALESCE(SUM(
            CASE 
                WHEN loads.rate_type = 'percentage' THEN (loads.load_amount * loads.rate_percentage / 100)
                ELSE loads.driver_rate
            END
        ), 0) INTO calculated_gross_earnings
        FROM loads 
        WHERE loads.payment_period_id = period_id
          AND loads.driver_user_id = driver_record.driver_user_id
          AND loads.status = 'delivered';
          
        -- Calcular gastos de combustible
        SELECT COALESCE(SUM(amount), 0) INTO calculated_fuel_expenses
        FROM fuel_expenses 
        WHERE payment_period_id = period_id 
          AND driver_user_id = driver_record.driver_user_id;
          
        -- Calcular otros ingresos
        SELECT COALESCE(SUM(amount), 0) INTO calculated_other_income
        FROM other_income 
        WHERE payment_period_id = period_id 
          AND user_id = driver_record.driver_user_id;
          
        -- Calcular total de deducciones
        SELECT COALESCE(SUM(amount), 0) INTO calculated_total_deductions
        FROM expense_instances
        WHERE payment_period_id = period_id 
          AND user_id = driver_record.driver_user_id
          AND status = 'applied';
          
        -- Calcular valores derivados
        calculated_net_payment := (calculated_gross_earnings + calculated_other_income) - calculated_fuel_expenses - calculated_total_deductions;
        calculated_has_negative_balance := calculated_net_payment < 0;
        
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
            calculated_gross_earnings,
            calculated_fuel_expenses,
            calculated_total_deductions,
            calculated_other_income,
            calculated_gross_earnings + calculated_other_income,
            calculated_net_payment,
            calculated_has_negative_balance,
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
END;
$function$;

-- 2. Arreglar función verify_and_recalculate_company_payments
CREATE OR REPLACE FUNCTION public.verify_and_recalculate_company_payments(target_company_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  period_record RECORD;
  driver_record RECORD;
  calculation_record RECORD;
  
  -- Totales calculados dinámicamente
  calculated_gross NUMERIC := 0;
  calculated_fuel NUMERIC := 0;
  calculated_deductions NUMERIC := 0;
  calculated_other_income NUMERIC := 0;
  calculated_total_income NUMERIC := 0;
  calculated_net NUMERIC := 0;
  calculated_negative BOOLEAN := false;
  
  -- Totales almacenados
  stored_gross NUMERIC;
  stored_fuel NUMERIC;
  stored_deductions NUMERIC;
  stored_other_income NUMERIC;
  stored_total_income NUMERIC;
  stored_net NUMERIC;
  stored_negative BOOLEAN;
  
  periods_updated INTEGER := 0;
  calculations_updated INTEGER := 0;
  integrity_issues INTEGER := 0;
BEGIN
  -- Verificar permisos del usuario actual
  IF NOT EXISTS (
    SELECT 1 FROM user_company_roles
    WHERE user_id = auth.uid()
    AND company_id = target_company_id
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Sin permisos para acceder a los datos de esta empresa';
  END IF;

  -- Iterar por todos los períodos de pago de la empresa
  FOR period_record IN 
    SELECT id, period_start_date, period_end_date 
    FROM company_payment_periods 
    WHERE company_id = target_company_id
    ORDER BY period_start_date DESC
  LOOP
    
    -- Iterar por todos los cálculos de conductores en este período
    FOR calculation_record IN
      SELECT * FROM driver_period_calculations 
      WHERE company_payment_period_id = period_record.id
    LOOP
      
      -- Obtener valores almacenados
      stored_gross := calculation_record.gross_earnings;
      stored_fuel := calculation_record.fuel_expenses;
      stored_deductions := calculation_record.total_deductions;
      stored_other_income := calculation_record.other_income;
      stored_total_income := calculation_record.total_income;
      stored_net := calculation_record.net_payment;
      stored_negative := calculation_record.has_negative_balance;
      
      -- CALCULAR GROSS EARNINGS CORRECTAMENTE: Solo cargas delivered del período específico
      SELECT COALESCE(SUM(
        CASE 
          WHEN loads.rate_type = 'percentage' THEN (loads.load_amount * loads.rate_percentage / 100)
          ELSE loads.driver_rate
        END
      ), 0) INTO calculated_gross
      FROM loads 
      WHERE loads.driver_user_id = calculation_record.driver_user_id
        AND loads.payment_period_id = period_record.id
        AND loads.status = 'delivered';
      
      -- CALCULAR FUEL EXPENSES
      SELECT COALESCE(SUM(amount), 0) INTO calculated_fuel
      FROM fuel_expenses 
      WHERE driver_user_id = calculation_record.driver_user_id
        AND payment_period_id = period_record.id;
      
      -- CALCULAR TOTAL DEDUCTIONS
      SELECT COALESCE(SUM(amount), 0) INTO calculated_deductions
      FROM expense_instances 
      WHERE user_id = calculation_record.driver_user_id
        AND payment_period_id = period_record.id
        AND status = 'applied';
      
      -- CALCULAR OTHER INCOME
      SELECT COALESCE(SUM(amount), 0) INTO calculated_other_income
      FROM other_income 
      WHERE user_id = calculation_record.driver_user_id
        AND payment_period_id = period_record.id;
      
      -- CALCULAR TOTALES DERIVADOS
      calculated_total_income := calculated_gross + calculated_other_income;
      calculated_net := calculated_total_income - calculated_fuel - calculated_deductions;
      calculated_negative := calculated_net < 0;
      
      -- VERIFICAR SI HAY DIFERENCIAS
      IF (calculated_gross != stored_gross OR 
          calculated_fuel != stored_fuel OR 
          calculated_deductions != stored_deductions OR 
          calculated_other_income != stored_other_income OR 
          calculated_total_income != stored_total_income OR 
          calculated_net != stored_net OR 
          calculated_negative != stored_negative) THEN
        
        integrity_issues := integrity_issues + 1;
        
        -- ACTUALIZAR AUTOMÁTICAMENTE
        UPDATE driver_period_calculations 
        SET 
          gross_earnings = calculated_gross,
          fuel_expenses = calculated_fuel,
          total_deductions = calculated_deductions,
          other_income = calculated_other_income,
          total_income = calculated_total_income,
          net_payment = calculated_net,
          has_negative_balance = calculated_negative,
          updated_at = now()
        WHERE id = calculation_record.id;
        
        calculations_updated := calculations_updated + 1;
      END IF;
      
    END LOOP;
    
    periods_updated := periods_updated + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'company_id', target_company_id,
    'periods_processed', periods_updated,
    'calculations_updated', calculations_updated,
    'integrity_issues_found', integrity_issues,
    'integrity_guaranteed', true,
    'processed_at', now(),
    'processed_by', auth.uid()
  );

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Error verificando integridad de cálculos: %', SQLERRM;
END;
$function$;