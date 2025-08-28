-- ARREGLAR FUNCIONES: Usar load_assignment_criteria de la empresa para determinar qué cargas incluir
-- El campo load_assignment_criteria define si las cargas se incluyen por:
-- 'assigned_date' - desde que se asignan
-- 'pickup_date' - desde que se recogen 
-- 'delivery_date' - desde que se entregan (solo delivered)

-- 1. Actualizar función recalculate_payment_period_totals
CREATE OR REPLACE FUNCTION public.recalculate_payment_period_totals(period_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    period_record RECORD;
    company_record RECORD;
    driver_record RECORD;
    calculated_gross_earnings NUMERIC;
    calculated_fuel_expenses NUMERIC;
    calculated_total_deductions NUMERIC;
    calculated_other_income NUMERIC;
    calculated_net_payment NUMERIC;
    calculated_has_negative_balance BOOLEAN;
    load_status_filter TEXT[];
BEGIN
    -- Obtener información del período y empresa
    SELECT cpp.*, c.load_assignment_criteria 
    INTO period_record
    FROM company_payment_periods cpp
    JOIN companies c ON cpp.company_id = c.id
    WHERE cpp.id = period_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Payment period not found: %', period_id;
    END IF;
    
    -- Determinar qué estados de carga incluir según criterio de la empresa
    CASE period_record.load_assignment_criteria
        WHEN 'delivery_date' THEN
            load_status_filter := ARRAY['delivered'];
        WHEN 'pickup_date' THEN  
            load_status_filter := ARRAY['in_transit', 'delivered'];
        ELSE -- 'assigned_date' o cualquier otro valor
            load_status_filter := ARRAY['assigned', 'in_transit', 'delivered'];
    END CASE;
    
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
        -- CALCULAR GROSS EARNINGS según criterio de la empresa
        SELECT COALESCE(SUM(
            CASE 
                WHEN loads.rate_type = 'percentage' THEN (loads.load_amount * loads.rate_percentage / 100)
                ELSE loads.driver_rate
            END
        ), 0) INTO calculated_gross_earnings
        FROM loads 
        WHERE loads.payment_period_id = period_id
          AND loads.driver_user_id = driver_record.driver_user_id
          AND loads.status = ANY(load_status_filter);
          
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

-- 2. Actualizar función verify_and_recalculate_company_payments
CREATE OR REPLACE FUNCTION public.verify_and_recalculate_company_payments(target_company_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  period_record RECORD;
  company_record RECORD;
  driver_record RECORD;
  calculation_record RECORD;
  load_status_filter TEXT[];
  
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

  -- Obtener configuración de la empresa
  SELECT load_assignment_criteria INTO company_record
  FROM companies
  WHERE id = target_company_id;
  
  -- Determinar qué estados de carga incluir según criterio de la empresa
  CASE company_record.load_assignment_criteria
      WHEN 'delivery_date' THEN
          load_status_filter := ARRAY['delivered'];
      WHEN 'pickup_date' THEN  
          load_status_filter := ARRAY['in_transit', 'delivered'];
      ELSE -- 'assigned_date' o cualquier otro valor
          load_status_filter := ARRAY['assigned', 'in_transit', 'delivered'];
  END CASE;

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
      
      -- CALCULAR GROSS EARNINGS según criterio de la empresa
      SELECT COALESCE(SUM(
        CASE 
          WHEN loads.rate_type = 'percentage' THEN (loads.load_amount * loads.rate_percentage / 100)
          ELSE loads.driver_rate
        END
      ), 0) INTO calculated_gross
      FROM loads 
      WHERE loads.driver_user_id = calculation_record.driver_user_id
        AND loads.payment_period_id = period_record.id
        AND loads.status = ANY(load_status_filter);
      
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
    'load_assignment_criteria', company_record.load_assignment_criteria,
    'integrity_guaranteed', true,
    'processed_at', now(),
    'processed_by', auth.uid()
  );

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Error verificando integridad de cálculos: %', SQLERRM;
END;
$function$;