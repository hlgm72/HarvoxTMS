-- ===============================================
-- 🚨 FASE 6: ACTUALIZAR FUNCIONES SQL AUXILIARES (FINAL)
-- Migración de referencias restantes a user_payment_periods
-- ===============================================

-- ============================================
-- 1. ACTUALIZAR assign_payment_period_to_load
-- ============================================

DROP FUNCTION IF EXISTS assign_payment_period_to_load(UUID, UUID);

CREATE OR REPLACE FUNCTION assign_payment_period_to_load(
  load_id_param UUID, 
  period_id_param UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_user_id UUID;
  load_record RECORD;
  period_record RECORD;
  result JSONB;
BEGIN
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  SELECT * INTO load_record FROM loads WHERE id = load_id_param;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Carga no encontrada'
    );
  END IF;

  SELECT * INTO period_record
  FROM company_payment_periods
  WHERE id = period_id_param;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Período de pago no encontrado'
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM user_company_roles ucr
    WHERE ucr.user_id = current_user_id
    AND ucr.company_id = period_record.company_id
    AND ucr.role IN ('company_owner', 'operations_manager', 'superadmin')
    AND ucr.is_active = true
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Sin permisos para esta operación'
    );
  END IF;

  UPDATE loads
  SET 
    payment_period_id = period_id_param,
    updated_at = now(),
    updated_by = current_user_id
  WHERE id = load_id_param;

  PERFORM recalculate_payment_period_totals(period_id_param);

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Carga asignada al período exitosamente',
    'load_id', load_id_param,
    'period_id', period_id_param,
    'assigned_by', current_user_id,
    'assigned_at', now()
  );

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Error asignando carga al período: %', SQLERRM;
END;
$function$;

-- ============================================
-- 2. ACTUALIZAR can_modify_financial_data_with_driver_check
-- ============================================

DROP FUNCTION IF EXISTS can_modify_financial_data_with_driver_check(UUID, UUID);

CREATE OR REPLACE FUNCTION can_modify_financial_data_with_user_check(
  period_id UUID, 
  user_id_param UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  period_locked BOOLEAN := false;
  user_paid BOOLEAN := false;
  total_users INTEGER := 0;
  paid_users INTEGER := 0;
  result JSONB;
BEGIN
  SELECT COALESCE(is_locked, false) INTO period_locked
  FROM company_payment_periods
  WHERE id = period_id;
  
  IF user_id_param IS NOT NULL THEN
    SELECT COALESCE(
      (SELECT payment_status = 'paid' 
       FROM user_payment_periods upp 
       WHERE upp.user_id = user_id_param 
       AND upp.company_payment_period_id = period_id), 
      false
    ) INTO user_paid;
  END IF;
  
  SELECT 
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE payment_status = 'paid') as paid
  INTO total_users, paid_users
  FROM user_payment_periods upp
  WHERE upp.company_payment_period_id = period_id;
  
  result := jsonb_build_object(
    'can_modify', NOT (period_locked OR user_paid),
    'is_locked', period_locked,
    'user_is_paid', user_paid,
    'paid_users', paid_users,
    'total_users', total_users,
    'warning_message', CASE
      WHEN period_locked THEN 'El período está completamente bloqueado'
      WHEN user_paid THEN 'Este usuario ya ha sido pagado y sus datos están protegidos'
      WHEN paid_users > 0 AND NOT period_locked THEN 'Hay usuarios pagados en este período - procede con cuidado'
      ELSE 'Los datos se pueden modificar'
    END
  );
  
  RETURN result;
END;
$function$;

-- ============================================
-- 3. ACTUALIZAR refresh_driver_period_deductions
-- ============================================

DROP FUNCTION IF EXISTS refresh_driver_period_deductions(UUID, UUID);

CREATE OR REPLACE FUNCTION refresh_user_period_deductions(
  user_id_param UUID, 
  period_id_param UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  calculation_id UUID;
  result JSONB;
BEGIN
  SELECT id INTO calculation_id
  FROM user_payment_periods
  WHERE user_id = user_id_param
  AND company_payment_period_id = period_id_param;
  
  IF calculation_id IS NOT NULL THEN
    PERFORM generate_load_percentage_deductions(NULL, calculation_id);
    
    result := jsonb_build_object(
      'success', true,
      'message', 'Descuentos recalculados exitosamente',
      'calculation_id', calculation_id
    );
  ELSE
    result := jsonb_build_object(
      'success', false,
      'message', 'No se encontró cálculo de período para este usuario'
    );
  END IF;
  
  RETURN result;
END;
$function$;

-- ============================================
-- 4. ACTUALIZAR update_expense_status_on_payment
-- ============================================

DROP TRIGGER IF EXISTS update_expense_status_on_payment ON user_payment_periods;

CREATE OR REPLACE FUNCTION update_expense_status_on_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.payment_status = 'paid' AND OLD.payment_status != 'paid' THEN
    UPDATE expense_instances
    SET status = 'applied', 
        applied_at = now(),
        applied_by = auth.uid()
    WHERE payment_period_id = NEW.id
      AND status = 'planned';
  END IF;
  
  RETURN NEW;
END;
$function$;

CREATE TRIGGER update_expense_status_on_payment
  AFTER UPDATE ON user_payment_periods
  FOR EACH ROW
  EXECUTE FUNCTION update_expense_status_on_payment();

-- ============================================
-- 5. ACTUALIZAR auto_lock_period_when_all_paid
-- ============================================

-- Eliminar triggers existentes solo de user_payment_periods
DROP TRIGGER IF EXISTS trigger_auto_lock_period ON user_payment_periods;
DROP TRIGGER IF EXISTS auto_lock_period_trigger ON user_payment_periods;

-- Eliminar la función con CASCADE
DROP FUNCTION IF EXISTS auto_lock_period_when_all_paid() CASCADE;

-- Crear la nueva función
CREATE OR REPLACE FUNCTION auto_lock_period_when_all_paid()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  period_id UUID;
  all_paid BOOLEAN;
BEGIN
  period_id := NEW.company_payment_period_id;
  
  SELECT NOT EXISTS (
    SELECT 1 FROM user_payment_periods
    WHERE company_payment_period_id = period_id
    AND payment_status != 'paid'
  ) INTO all_paid;
  
  IF all_paid THEN
    UPDATE company_payment_periods
    SET 
      is_locked = true,
      locked_at = now(),
      locked_by = auth.uid(),
      status = 'closed'
    WHERE id = period_id
    AND is_locked = false;
    
    RAISE LOG 'Period % auto-locked - all users paid', period_id;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Crear el nuevo trigger
CREATE TRIGGER auto_lock_period_trigger
  AFTER UPDATE ON user_payment_periods
  FOR EACH ROW
  WHEN (NEW.payment_status = 'paid' AND OLD.payment_status != 'paid')
  EXECUTE FUNCTION auto_lock_period_when_all_paid();

-- ============================================
-- 6. ACTUALIZAR cleanup_unnecessary_periods_created_today
-- ============================================

DROP FUNCTION IF EXISTS cleanup_unnecessary_periods_created_today();

CREATE OR REPLACE FUNCTION cleanup_unnecessary_periods_created_today()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  deleted_count INTEGER := 0;
  period_record RECORD;
BEGIN
  FOR period_record IN 
    SELECT cpp.id, cpp.period_start_date, cpp.period_end_date, cpp.company_id
    FROM company_payment_periods cpp
    WHERE DATE(cpp.created_at) = CURRENT_DATE
    AND cpp.status = 'open'
    AND NOT EXISTS (
      SELECT 1 FROM loads l WHERE l.payment_period_id IN (
        SELECT upp.id FROM user_payment_periods upp 
        WHERE upp.company_payment_period_id = cpp.id
      )
    )
    AND NOT EXISTS (
      SELECT 1 FROM expense_instances ei WHERE ei.payment_period_id IN (
        SELECT upp.id FROM user_payment_periods upp 
        WHERE upp.company_payment_period_id = cpp.id
      )
    )
    AND NOT EXISTS (
      SELECT 1 FROM user_payment_periods upp 
      WHERE upp.company_payment_period_id = cpp.id
      AND (upp.gross_earnings > 0 OR upp.fuel_expenses > 0 OR upp.total_deductions > 0)
    )
  LOOP
    DELETE FROM user_payment_periods 
    WHERE company_payment_period_id = period_record.id;
    
    DELETE FROM company_payment_periods 
    WHERE id = period_record.id;
    
    deleted_count := deleted_count + 1;
    
    RAISE LOG 'cleanup_unnecessary_periods: Deleted empty period % (% to %) for company %', 
      period_record.id, period_record.period_start_date, period_record.period_end_date, period_record.company_id;
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', true,
    'deleted_periods', deleted_count,
    'message', 'Períodos innecesarios eliminados exitosamente',
    'cleaned_at', now()
  );
END;
$function$;

-- ============================================
-- 7. CREAR FUNCIÓN HELPER is_user_paid_in_period
-- ============================================

DROP FUNCTION IF EXISTS is_driver_paid_in_period(UUID, UUID);

CREATE OR REPLACE FUNCTION is_user_paid_in_period(
  target_user_id UUID, 
  target_period_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT COALESCE(
    (SELECT payment_status = 'paid'
     FROM user_payment_periods upp
     WHERE upp.user_id = target_user_id
     AND upp.company_payment_period_id = target_period_id), 
    false
  );
$function$;

-- ============================================
-- 8. ACTUALIZAR is_financial_data_protected
-- ============================================

DROP FUNCTION IF EXISTS is_financial_data_protected(UUID, UUID);

CREATE OR REPLACE FUNCTION is_financial_data_protected(
  target_user_id UUID, 
  target_period_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT 
    COALESCE(is_payment_period_locked(target_period_id), false) OR 
    COALESCE(is_user_paid_in_period(target_user_id, target_period_id), false);
$function$;

-- ============================================
-- 9. AUDIT LOG
-- ============================================

INSERT INTO migration_audit_log (phase, operation, status)
VALUES ('auxiliary_functions', 'all_auxiliary_functions_updated', 'completed'),
       ('phase_summary', 'phase_6_auxiliary_migration_completed', 'completed');