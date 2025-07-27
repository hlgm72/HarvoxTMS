-- ============================================
-- TRIGGERS AUTOMÁTICOS PARA RECÁLCULO DE PERÍODOS
-- ============================================

-- Función principal para recálculo automático
CREATE OR REPLACE FUNCTION public.auto_recalculate_driver_period()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  target_calculation_id UUID;
  company_period_id UUID;
  driver_id UUID;
  calc_result JSONB;
BEGIN
  -- Determinar los valores según la tabla que disparó el trigger
  CASE TG_TABLE_NAME
    WHEN 'loads' THEN
      driver_id := COALESCE(NEW.driver_user_id, OLD.driver_user_id);
      company_period_id := COALESCE(NEW.payment_period_id, OLD.payment_period_id);
      
    WHEN 'fuel_expenses' THEN
      driver_id := COALESCE(NEW.driver_user_id, OLD.driver_user_id);
      -- Para fuel_expenses, necesitamos encontrar el company_payment_period_id
      SELECT dpc.company_payment_period_id INTO company_period_id
      FROM driver_period_calculations dpc
      WHERE dpc.id = COALESCE(NEW.payment_period_id, OLD.payment_period_id);
      
    WHEN 'expense_instances' THEN
      -- Para expense_instances, obtenemos driver y company_period de la calculation
      SELECT dpc.driver_user_id, dpc.company_payment_period_id 
      INTO driver_id, company_period_id
      FROM driver_period_calculations dpc
      WHERE dpc.id = COALESCE(NEW.payment_period_id, OLD.payment_period_id);
      
    WHEN 'other_income' THEN
      driver_id := COALESCE(NEW.driver_user_id, OLD.driver_user_id);
      -- Para other_income, necesitamos encontrar el company_payment_period_id
      SELECT dpc.company_payment_period_id INTO company_period_id
      FROM driver_period_calculations dpc
      WHERE dpc.id = COALESCE(NEW.payment_period_id, OLD.payment_period_id);
  END CASE;

  -- Salir si no tenemos datos suficientes
  IF driver_id IS NULL OR company_period_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Verificar que el período no esté bloqueado
  IF EXISTS (
    SELECT 1 FROM company_payment_periods 
    WHERE id = company_period_id AND is_locked = true
  ) THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Buscar o crear el calculation record
  SELECT id INTO target_calculation_id
  FROM driver_period_calculations
  WHERE company_payment_period_id = company_period_id
    AND driver_user_id = driver_id;

  -- Si no existe el calculation, crearlo
  IF target_calculation_id IS NULL THEN
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
      payment_status
    ) VALUES (
      company_period_id,
      driver_id,
      0, 0, 0, 0, 0, 0, false,
      'calculated'
    ) RETURNING id INTO target_calculation_id;
  END IF;

  -- Ejecutar el recálculo
  SELECT calculate_driver_payment_period(target_calculation_id) INTO calc_result;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- ============================================
-- TRIGGERS EN TODAS LAS TABLAS RELEVANTES
-- ============================================

-- 1. TRIGGER PARA LOADS
DROP TRIGGER IF EXISTS trigger_auto_recalc_loads ON public.loads;
CREATE TRIGGER trigger_auto_recalc_loads
  AFTER INSERT OR UPDATE OR DELETE ON public.loads
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_recalculate_driver_period();

-- 2. TRIGGER PARA FUEL_EXPENSES  
DROP TRIGGER IF EXISTS trigger_auto_recalc_fuel ON public.fuel_expenses;
CREATE TRIGGER trigger_auto_recalc_fuel
  AFTER INSERT OR UPDATE OR DELETE ON public.fuel_expenses
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_recalculate_driver_period();

-- 3. TRIGGER PARA EXPENSE_INSTANCES
DROP TRIGGER IF EXISTS trigger_auto_recalc_expenses ON public.expense_instances;
CREATE TRIGGER trigger_auto_recalc_expenses
  AFTER INSERT OR UPDATE OR DELETE ON public.expense_instances
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_recalculate_driver_period();

-- 4. TRIGGER PARA OTHER_INCOME
DROP TRIGGER IF EXISTS trigger_auto_recalc_income ON public.other_income;
CREATE TRIGGER trigger_auto_recalc_income
  AFTER INSERT OR UPDATE OR DELETE ON public.other_income
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_recalculate_driver_period();

-- ============================================
-- FUNCIÓN PARA CREAR CÁLCULOS AUTOMÁTICAMENTE
-- ============================================

-- Función para crear automáticamente driver_period_calculations cuando se crea un período
CREATE OR REPLACE FUNCTION public.auto_create_driver_calculations()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  driver_record RECORD;
BEGIN
  -- Solo para INSERT de nuevos períodos
  IF TG_OP = 'INSERT' THEN
    -- Crear calculations para todos los conductores activos de la empresa
    FOR driver_record IN 
      SELECT ucr.user_id
      FROM user_company_roles ucr
      WHERE ucr.company_id = NEW.company_id 
        AND ucr.role = 'driver' 
        AND ucr.is_active = true
    LOOP
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
        payment_status
      ) VALUES (
        NEW.id,
        driver_record.user_id,
        0, 0, 0, 0, 0, 0, false,
        'calculated'
      )
      ON CONFLICT (company_payment_period_id, driver_user_id) DO NOTHING;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$;

-- TRIGGER para crear calculations automáticamente
DROP TRIGGER IF EXISTS trigger_auto_create_calculations ON public.company_payment_periods;
CREATE TRIGGER trigger_auto_create_calculations
  AFTER INSERT ON public.company_payment_periods
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_driver_calculations();