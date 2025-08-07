-- Función mejorada para calcular períodos de pago incluyendo cargas asignadas
CREATE OR REPLACE FUNCTION public.calculate_driver_payment_period_with_validation(period_calculation_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  calculation_record RECORD;
  completed_loads_total NUMERIC := 0;
  assigned_loads_total NUMERIC := 0;
  total_loads NUMERIC := 0;
  fuel_total NUMERIC := 0;
  deductions_total NUMERIC := 0;
  other_income_total NUMERIC := 0;
  total_income NUMERIC := 0;
  net_payment NUMERIC := 0;
  has_negative BOOLEAN := false;
  current_user_id UUID;
BEGIN
  -- Get current authenticated user
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  -- Get the calculation record with permission validation
  SELECT dpc.*, cpp.company_id, cpp.period_start_date, cpp.period_end_date
  INTO calculation_record
  FROM driver_period_calculations dpc
  JOIN company_payment_periods cpp ON dpc.company_payment_period_id = cpp.id
  JOIN user_company_roles ucr ON cpp.company_id = ucr.company_id
  WHERE dpc.id = period_calculation_id
  AND ucr.user_id = current_user_id
  AND ucr.is_active = true
  AND ucr.role IN ('company_owner', 'operations_manager', 'dispatcher', 'superadmin');
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cálculo no encontrado o sin permisos para acceder';
  END IF;

  -- Start atomic calculation process
  
  -- ================================
  -- 1. CALCULATE LOADS TOTAL (INCLUYE ASIGNADAS Y COMPLETADAS)
  -- ================================
  -- Cargas completadas (100% del valor)
  SELECT COALESCE(SUM(total_amount), 0) INTO completed_loads_total
  FROM loads l
  WHERE l.driver_user_id = calculation_record.driver_user_id
  AND l.payment_period_id = calculation_record.company_payment_period_id
  AND l.status = 'completed';
  
  -- Cargas asignadas (100% del valor para mostrar expectativa)
  SELECT COALESCE(SUM(total_amount), 0) INTO assigned_loads_total
  FROM loads l
  WHERE l.driver_user_id = calculation_record.driver_user_id
  AND l.payment_period_id = calculation_record.company_payment_period_id
  AND l.status IN ('assigned', 'in_transit');
  
  -- Total de ingresos brutos (cargas completadas + asignadas)
  total_loads := completed_loads_total + assigned_loads_total;
  
  -- ================================
  -- 2. CALCULATE FUEL EXPENSES TOTAL
  -- ================================
  SELECT COALESCE(SUM(total_amount), 0) INTO fuel_total
  FROM fuel_expenses fe
  WHERE fe.driver_user_id = calculation_record.driver_user_id
  AND fe.payment_period_id = period_calculation_id;
  
  -- ================================
  -- 3. CALCULATE DEDUCTIONS TOTAL
  -- ================================
  SELECT COALESCE(SUM(amount), 0) INTO deductions_total
  FROM expense_instances ei
  WHERE ei.user_id = calculation_record.driver_user_id
  AND ei.payment_period_id = period_calculation_id
  AND ei.status = 'applied';
  
  -- ================================
  -- 4. CALCULATE OTHER INCOME TOTAL
  -- ================================
  SELECT COALESCE(SUM(amount), 0) INTO other_income_total
  FROM other_income oi
  WHERE oi.user_id = calculation_record.driver_user_id
  AND oi.payment_period_id = period_calculation_id
  AND oi.status = 'approved';
  
  -- ================================
  -- 5. GENERATE PERCENTAGE DEDUCTIONS
  -- ================================
  PERFORM generate_load_percentage_deductions(NULL, period_calculation_id);
  
  -- Recalculate deductions after percentage deductions
  SELECT COALESCE(SUM(amount), 0) INTO deductions_total
  FROM expense_instances ei
  WHERE ei.user_id = calculation_record.driver_user_id
  AND ei.payment_period_id = period_calculation_id
  AND ei.status = 'applied';
  
  -- ================================
  -- 6. CALCULATE FINAL TOTALS
  -- ================================
  total_income := total_loads + other_income_total;
  net_payment := total_income - fuel_total - deductions_total;
  has_negative := net_payment < 0;
  
  -- ================================
  -- 7. UPDATE CALCULATION RECORD ATOMICALLY
  -- ================================
  UPDATE driver_period_calculations
  SET 
    gross_earnings = total_loads,  -- Ahora incluye cargas asignadas
    fuel_expenses = fuel_total,
    total_deductions = deductions_total,
    other_income = other_income_total,
    total_income = total_income,
    net_payment = net_payment,
    has_negative_balance = has_negative,
    payment_status = CASE 
      WHEN has_negative THEN 'needs_review'
      WHEN assigned_loads_total > 0 AND completed_loads_total = 0 THEN 'projected'
      WHEN assigned_loads_total > 0 AND completed_loads_total > 0 THEN 'partial'
      ELSE 'calculated'
    END,
    calculated_at = now(),
    calculated_by = current_user_id,
    updated_at = now()
  WHERE id = period_calculation_id;
  
  -- Return success result
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Período calculado exitosamente con cargas asignadas incluidas',
    'calculation_id', period_calculation_id,
    'gross_earnings', total_loads,
    'completed_loads_total', completed_loads_total,
    'assigned_loads_total', assigned_loads_total,
    'fuel_expenses', fuel_total,
    'total_deductions', deductions_total,
    'other_income', other_income_total,
    'total_income', total_income,
    'net_payment', net_payment,
    'has_negative_balance', has_negative,
    'calculated_at', now()
  );

EXCEPTION WHEN OTHERS THEN
  -- Automatic rollback on any error
  RAISE EXCEPTION 'Error en cálculo ACID del período: %', SQLERRM;
END;
$function$;

-- Trigger para recalcular automáticamente cuando se asigna/modifica una carga
CREATE OR REPLACE FUNCTION public.auto_recalculate_on_load_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo recalcular si cambió el estado, driver o monto
  IF (TG_OP = 'INSERT') OR 
     (TG_OP = 'UPDATE' AND (
       OLD.status IS DISTINCT FROM NEW.status OR
       OLD.driver_user_id IS DISTINCT FROM NEW.driver_user_id OR
       OLD.total_amount IS DISTINCT FROM NEW.total_amount OR
       OLD.payment_period_id IS DISTINCT FROM NEW.payment_period_id
     )) THEN
     
    -- Recalcular para el driver actual
    IF NEW.driver_user_id IS NOT NULL AND NEW.payment_period_id IS NOT NULL THEN
      INSERT INTO driver_period_calculations (
        driver_user_id,
        company_payment_period_id,
        payment_status
      ) VALUES (
        NEW.driver_user_id,
        NEW.payment_period_id,
        'needs_calculation'
      )
      ON CONFLICT (driver_user_id, company_payment_period_id) 
      DO UPDATE SET 
        payment_status = 'needs_calculation',
        updated_at = now();
        
      -- Ejecutar el recálculo inmediatamente
      PERFORM calculate_driver_payment_period_with_validation(
        (SELECT id FROM driver_period_calculations 
         WHERE driver_user_id = NEW.driver_user_id 
         AND company_payment_period_id = NEW.payment_period_id)
      );
    END IF;
    
    -- Si cambió de driver, recalcular el driver anterior también
    IF TG_OP = 'UPDATE' AND OLD.driver_user_id IS DISTINCT FROM NEW.driver_user_id AND OLD.driver_user_id IS NOT NULL THEN
      PERFORM calculate_driver_payment_period_with_validation(
        (SELECT id FROM driver_period_calculations 
         WHERE driver_user_id = OLD.driver_user_id 
         AND company_payment_period_id = OLD.payment_period_id)
      );
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Aplicar el trigger a la tabla loads
DROP TRIGGER IF EXISTS trigger_auto_recalculate_loads ON loads;
CREATE TRIGGER trigger_auto_recalculate_loads
  AFTER INSERT OR UPDATE ON loads
  FOR EACH ROW
  EXECUTE FUNCTION auto_recalculate_on_load_change();

-- Habilitar realtime para las tablas relevantes
ALTER TABLE driver_period_calculations REPLICA IDENTITY FULL;
ALTER TABLE loads REPLICA IDENTITY FULL;

-- Agregar las tablas a la publicación de realtime
ALTER PUBLICATION supabase_realtime ADD TABLE driver_period_calculations;
ALTER PUBLICATION supabase_realtime ADD TABLE loads;