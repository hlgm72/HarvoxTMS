-- ===============================================
-- 🚨 MIGRACIÓN CRÍTICA: ARREGLAR SISTEMA DE CÁLCULOS (v2)
-- ===============================================
-- Arregla el sistema de recálculo automático roto

-- PASO 1: Eliminar función existente que tiene tipo de retorno diferente
DROP FUNCTION IF EXISTS public.recalculate_payment_period_totals(UUID);

-- PASO 2: Crear función de recálculo corregida para períodos específicos
CREATE OR REPLACE FUNCTION public.recalculate_payment_period_totals(target_period_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  calculation_record RECORD;
  company_record RECORD;
  load_status_filter TEXT[];
  
  -- Totales calculados dinámicamente
  calculated_gross NUMERIC := 0;
  calculated_fuel NUMERIC := 0;
  calculated_deductions NUMERIC := 0;
  calculated_other_income NUMERIC := 0;
  calculated_total_income NUMERIC := 0;
  calculated_net NUMERIC := 0;
  calculated_negative BOOLEAN := false;
BEGIN
  -- LOG: Inicio de recálculo
  RAISE LOG 'recalculate_payment_period_totals: Iniciando recálculo para período %', target_period_id;

  -- Obtener configuración de la empresa para este período
  SELECT c.load_assignment_criteria INTO company_record
  FROM company_payment_periods cpp
  JOIN companies c ON cpp.company_id = c.id
  WHERE cpp.id = target_period_id;
  
  IF NOT FOUND THEN
    RAISE LOG 'recalculate_payment_period_totals: Período % no encontrado', target_period_id;
    RETURN;
  END IF;

  -- Determinar qué estados de carga incluir según criterio de la empresa
  CASE company_record.load_assignment_criteria
      WHEN 'delivery_date' THEN
          load_status_filter := ARRAY['delivered'];
      WHEN 'pickup_date' THEN  
          -- CORREGIDO: Incluir assigned, in_transit, delivered (NO created)
          load_status_filter := ARRAY['assigned', 'in_transit', 'delivered'];
      ELSE -- 'assigned_date' o cualquier otro valor
          load_status_filter := ARRAY['assigned', 'in_transit', 'delivered'];
  END CASE;

  RAISE LOG 'recalculate_payment_period_totals: Usando criterio % con status %', 
    company_record.load_assignment_criteria, load_status_filter;

  -- Iterar por todos los cálculos de conductores en este período
  FOR calculation_record IN
    SELECT * FROM driver_period_calculations 
    WHERE company_payment_period_id = target_period_id
  LOOP
    
    -- CALCULAR GROSS EARNINGS = SUMA TOTAL DE CARGAS (SOLO STATUS VÁLIDOS)
    SELECT COALESCE(SUM(loads.total_amount), 0) INTO calculated_gross
    FROM loads 
    WHERE loads.driver_user_id = calculation_record.driver_user_id
      AND loads.payment_period_id = target_period_id
      AND loads.status = ANY(load_status_filter);
    
    -- CALCULAR FUEL EXPENSES
    SELECT COALESCE(SUM(total_amount), 0) INTO calculated_fuel
    FROM fuel_expenses 
    WHERE driver_user_id = calculation_record.driver_user_id
      AND payment_period_id = calculation_record.id;
    
    -- CALCULAR TOTAL DEDUCTIONS (usar calculation_id correcto)
    SELECT COALESCE(SUM(amount), 0) INTO calculated_deductions
    FROM expense_instances 
    WHERE user_id = calculation_record.driver_user_id
      AND payment_period_id = calculation_record.id
      AND status = 'applied';
    
    -- CALCULAR OTHER INCOME
    SELECT COALESCE(SUM(amount), 0) INTO calculated_other_income
    FROM other_income 
    WHERE user_id = calculation_record.driver_user_id
      AND payment_period_id = calculation_record.id;
    
    -- CALCULAR TOTALES DERIVADOS usando la librería crítica
    calculated_total_income := calculated_gross + calculated_other_income;
    calculated_net := calculated_total_income - calculated_fuel - calculated_deductions;
    calculated_negative := calculated_net < 0;
    
    -- ACTUALIZAR SIEMPRE (para asegurar consistencia)
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
    
    RAISE LOG 'recalculate_payment_period_totals: Driver % actualizado - gross: %, deductions: %, net: %',
      calculation_record.driver_user_id, calculated_gross, calculated_deductions, calculated_net;
      
  END LOOP;

  RAISE LOG 'recalculate_payment_period_totals: Completado para período %', target_period_id;

EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'recalculate_payment_period_totals: ERROR - %', SQLERRM;
END;
$$;

-- PASO 3: Crear triggers de recálculo automático (LOS QUE FALTABAN)

-- Trigger para loads
CREATE OR REPLACE FUNCTION public.auto_recalculate_on_loads()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  target_period_id UUID;
BEGIN
  -- Obtener period_id del registro afectado
  target_period_id := COALESCE(NEW.payment_period_id, OLD.payment_period_id);
  
  -- Solo proceder si tenemos un período válido
  IF target_period_id IS NOT NULL THEN
    -- Ejecutar recálculo para el período específico
    PERFORM recalculate_payment_period_totals(target_period_id);
    RAISE LOG 'auto_recalculate_on_loads: Recálculo ejecutado para período %', target_period_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- PASO 4: Crear los triggers en las tablas (LOS QUE FALTABAN COMPLETAMENTE)

-- Triggers para loads
DROP TRIGGER IF EXISTS trigger_auto_recalculate_loads_insert ON loads;
DROP TRIGGER IF EXISTS trigger_auto_recalculate_loads_update ON loads;
DROP TRIGGER IF EXISTS trigger_auto_recalculate_loads_delete ON loads;

CREATE TRIGGER trigger_auto_recalculate_loads_insert
    AFTER INSERT ON loads
    FOR EACH ROW
    EXECUTE FUNCTION auto_recalculate_on_loads();

CREATE TRIGGER trigger_auto_recalculate_loads_update
    AFTER UPDATE ON loads
    FOR EACH ROW
    EXECUTE FUNCTION auto_recalculate_on_loads();

CREATE TRIGGER trigger_auto_recalculate_loads_delete
    AFTER DELETE ON loads
    FOR EACH ROW
    EXECUTE FUNCTION auto_recalculate_on_loads();

-- PASO 5: Ejecutar recálculo inmediato para semana 31 (Diosvani)
SELECT recalculate_payment_period_totals('9bfc342f-6330-4d2d-8eab-ee9993d17bc3');

-- PASO 6: Log de finalización
SELECT 'MIGRACIÓN COMPLETADA: Sistema de recálculo automático restaurado' as status;