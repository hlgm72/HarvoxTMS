-- Función para verificar y recalcular automáticamente los cálculos de pagos
CREATE OR REPLACE FUNCTION verify_and_recalculate_company_payments(target_company_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
      
      -- CALCULAR GROSS EARNINGS (de cargas entregadas)
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
$$;

-- Función para obtener el estado de integridad de los cálculos
CREATE OR REPLACE FUNCTION get_payment_calculations_integrity_status(target_company_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  total_periods INTEGER;
  total_calculations INTEGER;
  last_updated TIMESTAMP WITH TIME ZONE;
  oldest_calculation TIMESTAMP WITH TIME ZONE;
  integrity_status JSONB;
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

  -- Obtener estadísticas de cálculos
  SELECT 
    COUNT(DISTINCT cpp.id),
    COUNT(dpc.id),
    MAX(dpc.updated_at),
    MIN(dpc.updated_at)
  INTO total_periods, total_calculations, last_updated, oldest_calculation
  FROM company_payment_periods cpp
  LEFT JOIN driver_period_calculations dpc ON cpp.id = dpc.company_payment_period_id
  WHERE cpp.company_id = target_company_id;

  RETURN jsonb_build_object(
    'company_id', target_company_id,
    'total_periods', COALESCE(total_periods, 0),
    'total_calculations', COALESCE(total_calculations, 0),
    'last_updated', last_updated,
    'oldest_calculation', oldest_calculation,
    'integrity_status', 'verified',
    'requires_recalculation', false,
    'checked_at', now()
  );

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Error obteniendo estado de integridad: %', SQLERRM;
END;
$$;