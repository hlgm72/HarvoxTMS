-- Modificar la función para calcular descuentos desde el estado 'assigned'
CREATE OR REPLACE FUNCTION public.generate_load_percentage_deductions(load_id_param uuid, period_calculation_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  period_record RECORD;
  driver_id UUID;
  leasing_expense_type_id UUID;
  factoring_expense_type_id UUID;
  dispatching_expense_type_id UUID;
  total_leasing NUMERIC := 0;
  total_factoring NUMERIC := 0;
  total_dispatching NUMERIC := 0;
BEGIN
  -- Obtener información del período
  SELECT dpc.*, cpp.period_start_date, cpp.period_end_date
  INTO period_record
  FROM driver_period_calculations dpc
  JOIN company_payment_periods cpp ON dpc.company_payment_period_id = cpp.id
  WHERE dpc.id = period_calculation_id;
  
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  driver_id := period_record.driver_user_id;
  
  -- Obtener IDs de los tipos de expense
  SELECT id INTO leasing_expense_type_id FROM expense_types WHERE name = 'Leasing Fee';
  SELECT id INTO factoring_expense_type_id FROM expense_types WHERE name = 'Factoring Fee';
  SELECT id INTO dispatching_expense_type_id FROM expense_types WHERE name = 'Dispatching Fee';
  
  -- Calcular totales consolidados de todas las cargas del período (incluyendo 'assigned')
  SELECT 
    COALESCE(SUM(l.total_amount * (COALESCE(l.leasing_percentage, 0) / 100)), 0),
    COALESCE(SUM(l.total_amount * (COALESCE(l.factoring_percentage, 0) / 100)), 0),
    COALESCE(SUM(l.total_amount * (COALESCE(l.dispatching_percentage, 0) / 100)), 0)
  INTO total_leasing, total_factoring, total_dispatching
  FROM loads l
  WHERE l.driver_user_id = driver_id
  AND l.payment_period_id = period_record.company_payment_period_id
  AND l.status IN ('assigned', 'in_transit', 'delivered', 'completed'); -- Incluir más estados
  
  -- Insertar/actualizar deducción consolidada de leasing
  IF leasing_expense_type_id IS NOT NULL THEN
    INSERT INTO expense_instances (
      payment_period_id,
      expense_type_id,
      driver_user_id,
      amount,
      description,
      expense_date,
      status,
      created_by,
      applied_by,
      applied_at
    ) VALUES (
      period_calculation_id,
      leasing_expense_type_id,
      driver_id,
      total_leasing,
      'Leasing fees for period ' || period_record.period_start_date || ' to ' || period_record.period_end_date,
      period_record.period_end_date,
      'applied',
      auth.uid(),
      auth.uid(),
      now()
    )
    ON CONFLICT (payment_period_id, expense_type_id, driver_user_id) 
    DO UPDATE SET 
      amount = total_leasing,
      description = 'Leasing fees for period ' || period_record.period_start_date || ' to ' || period_record.period_end_date,
      updated_at = now();
  END IF;
  
  -- Insertar/actualizar deducción consolidada de factoring
  IF factoring_expense_type_id IS NOT NULL THEN
    INSERT INTO expense_instances (
      payment_period_id,
      expense_type_id,
      driver_user_id,
      amount,
      description,
      expense_date,
      status,
      created_by,
      applied_by,
      applied_at
    ) VALUES (
      period_calculation_id,
      factoring_expense_type_id,
      driver_id,
      total_factoring,
      'Factoring fees for period ' || period_record.period_start_date || ' to ' || period_record.period_end_date,
      period_record.period_end_date,
      'applied',
      auth.uid(),
      auth.uid(),
      now()
    )
    ON CONFLICT (payment_period_id, expense_type_id, driver_user_id) 
    DO UPDATE SET 
      amount = total_factoring,
      description = 'Factoring fees for period ' || period_record.period_start_date || ' to ' || period_record.period_end_date,
      updated_at = now();
  END IF;
  
  -- Insertar/actualizar deducción consolidada de dispatching
  IF dispatching_expense_type_id IS NOT NULL THEN
    INSERT INTO expense_instances (
      payment_period_id,
      expense_type_id,
      driver_user_id,
      amount,
      description,
      expense_date,
      status,
      created_by,
      applied_by,
      applied_at
    ) VALUES (
      period_calculation_id,
      dispatching_expense_type_id,
      driver_id,
      total_dispatching,
      'Dispatching fees for period ' || period_record.period_start_date || ' to ' || period_record.period_end_date,
      period_record.period_end_date,
      'applied',
      auth.uid(),
      auth.uid(),
      now()
    )
    ON CONFLICT (payment_period_id, expense_type_id, driver_user_id) 
    DO UPDATE SET 
      amount = total_dispatching,
      description = 'Dispatching fees for period ' || period_record.period_start_date || ' to ' || period_record.period_end_date,
      updated_at = now();
  END IF;
  
END;
$function$;

-- Crear función para recalcular descuentos de un conductor en un período específico
CREATE OR REPLACE FUNCTION public.recalculate_driver_period_deductions(driver_id_param uuid, period_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  calculation_id UUID;
BEGIN
  -- Buscar el cálculo del conductor para el período
  SELECT id INTO calculation_id
  FROM driver_period_calculations
  WHERE driver_user_id = driver_id_param
  AND company_payment_period_id = period_id_param;
  
  IF calculation_id IS NOT NULL THEN
    -- Recalcular los descuentos
    PERFORM generate_load_percentage_deductions(NULL, calculation_id);
  END IF;
END;
$function$;

-- Crear trigger function que se ejecuta cuando se actualiza una carga
CREATE OR REPLACE FUNCTION public.trigger_recalculate_load_deductions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Recalcular para la nueva carga (si tiene driver asignado)
  IF NEW.driver_user_id IS NOT NULL AND NEW.payment_period_id IS NOT NULL THEN
    PERFORM recalculate_driver_period_deductions(NEW.driver_user_id, NEW.payment_period_id);
  END IF;
  
  -- Si cambió el driver o período, recalcular también para el anterior
  IF TG_OP = 'UPDATE' THEN
    IF OLD.driver_user_id IS NOT NULL AND OLD.payment_period_id IS NOT NULL AND 
       (OLD.driver_user_id != NEW.driver_user_id OR OLD.payment_period_id != NEW.payment_period_id) THEN
      PERFORM recalculate_driver_period_deductions(OLD.driver_user_id, OLD.payment_period_id);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Crear trigger function para cuando se elimina una carga
CREATE OR REPLACE FUNCTION public.trigger_recalculate_load_deductions_on_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Recalcular para el driver de la carga eliminada
  IF OLD.driver_user_id IS NOT NULL AND OLD.payment_period_id IS NOT NULL THEN
    PERFORM recalculate_driver_period_deductions(OLD.driver_user_id, OLD.payment_period_id);
  END IF;
  
  RETURN OLD;
END;
$function$;

-- Crear triggers en la tabla loads
DROP TRIGGER IF EXISTS trigger_loads_recalculate_deductions_after_update ON loads;
DROP TRIGGER IF EXISTS trigger_loads_recalculate_deductions_after_insert ON loads;
DROP TRIGGER IF EXISTS trigger_loads_recalculate_deductions_after_delete ON loads;

CREATE TRIGGER trigger_loads_recalculate_deductions_after_insert
  AFTER INSERT ON loads
  FOR EACH ROW
  EXECUTE FUNCTION trigger_recalculate_load_deductions();

CREATE TRIGGER trigger_loads_recalculate_deductions_after_update
  AFTER UPDATE ON loads
  FOR EACH ROW
  EXECUTE FUNCTION trigger_recalculate_load_deductions();

CREATE TRIGGER trigger_loads_recalculate_deductions_after_delete
  AFTER DELETE ON loads
  FOR EACH ROW
  EXECUTE FUNCTION trigger_recalculate_load_deductions_on_delete();