-- Eliminar y recrear función recalculate_payment_period_totals con las columnas correctas
DROP FUNCTION IF EXISTS public.recalculate_payment_period_totals(uuid);

CREATE OR REPLACE FUNCTION public.recalculate_payment_period_totals(target_period_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  period_record RECORD;
  company_record RECORD;
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
  
  calculations_updated INTEGER := 0;
BEGIN
  -- Obtener información del período y empresa
  SELECT cpp.*, c.load_assignment_criteria
  INTO period_record
  FROM company_payment_periods cpp
  JOIN companies c ON cpp.company_id = c.id
  WHERE cpp.id = target_period_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Período de pago no encontrado';
  END IF;

  -- Verificar permisos del usuario actual
  IF NOT EXISTS (
    SELECT 1 FROM user_company_roles
    WHERE user_id = auth.uid()
    AND company_id = period_record.company_id
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Sin permisos para acceder a los datos de esta empresa';
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

  -- Iterar por todos los cálculos de conductores en este período
  FOR calculation_record IN
    SELECT * FROM driver_period_calculations 
    WHERE company_payment_period_id = target_period_id
  LOOP
    
    -- CALCULAR GROSS EARNINGS correctamente usando las columnas reales
    SELECT COALESCE(SUM(
      -- El conductor recibe: total_amount - dispatching% - factoring% - leasing%
      loads.total_amount * (1.0 - 
        COALESCE(loads.dispatching_percentage, 0) / 100.0 - 
        COALESCE(loads.factoring_percentage, 0) / 100.0 - 
        COALESCE(loads.leasing_percentage, 0) / 100.0
      )
    ), 0) INTO calculated_gross
    FROM loads 
    WHERE loads.driver_user_id = calculation_record.driver_user_id
      AND loads.payment_period_id = target_period_id
      AND loads.status = ANY(load_status_filter);
    
    -- CALCULAR FUEL EXPENSES
    SELECT COALESCE(SUM(amount), 0) INTO calculated_fuel
    FROM fuel_expenses 
    WHERE driver_user_id = calculation_record.driver_user_id
      AND payment_period_id = target_period_id;
    
    -- CALCULAR TOTAL DEDUCTIONS
    SELECT COALESCE(SUM(amount), 0) INTO calculated_deductions
    FROM expense_instances 
    WHERE user_id = calculation_record.driver_user_id
      AND payment_period_id = target_period_id
      AND status = 'applied';
    
    -- CALCULAR OTHER INCOME
    SELECT COALESCE(SUM(amount), 0) INTO calculated_other_income
    FROM other_income 
    WHERE user_id = calculation_record.driver_user_id
      AND payment_period_id = target_period_id;
    
    -- CALCULAR TOTALES DERIVADOS
    calculated_total_income := calculated_gross + calculated_other_income;
    calculated_net := calculated_total_income - calculated_fuel - calculated_deductions;
    calculated_negative := calculated_net < 0;
    
    -- ACTUALIZAR CÁLCULO
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
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'period_id', target_period_id,
    'calculations_updated', calculations_updated,
    'load_assignment_criteria', period_record.load_assignment_criteria,
    'processed_at', now(),
    'processed_by', auth.uid()
  );

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Error recalculando período: %', SQLERRM;
END;
$function$;