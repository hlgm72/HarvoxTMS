-- ===================================================================
-- SISTEMA DE INTEGRIDAD FINANCIERA POST-PAGO
-- Garantiza inmutabilidad de datos una vez marcado como pagado
-- ===================================================================

-- ===================================================================
-- 1. FUNCIÓN DE VALIDACIÓN: Verificar si período está bloqueado
-- ===================================================================
CREATE OR REPLACE FUNCTION public.is_payment_period_locked(period_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(is_locked, false)
  FROM company_payment_periods
  WHERE id = period_id;
$$;

-- ===================================================================
-- 2. PROTECCIÓN DE CARGAS (LOADS) - CRÍTICO
-- ===================================================================
-- Las cargas son la base del cálculo de ingresos

-- Política para SELECT (mantener acceso de lectura)
DROP POLICY IF EXISTS "loads_unified_access" ON loads;
CREATE POLICY "loads_select_access" ON loads
FOR SELECT USING (
  auth.role() = 'authenticated' AND
  auth.uid() IS NOT NULL AND
  COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false AND 
  (
    driver_user_id = auth.uid() OR
    (driver_user_id IS NULL AND created_by = auth.uid()) OR
    payment_period_id IN (
      SELECT cpp.id FROM company_payment_periods cpp
      JOIN user_company_roles ucr ON cpp.company_id = ucr.company_id
      WHERE ucr.user_id = auth.uid() AND ucr.is_active = true
    )
  )
);

-- Política para INSERT (permitir crear nuevas cargas)
CREATE POLICY "loads_insert_access" ON loads
FOR INSERT WITH CHECK (
  auth.role() = 'authenticated' AND
  auth.uid() IS NOT NULL AND
  COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false AND
  (
    driver_user_id = auth.uid() OR
    (driver_user_id IS NULL AND created_by = auth.uid()) OR
    payment_period_id IN (
      SELECT cpp.id FROM company_payment_periods cpp
      JOIN user_company_roles ucr ON cpp.company_id = ucr.company_id
      WHERE ucr.user_id = auth.uid() AND ucr.is_active = true
    )
  )
);

-- Política para UPDATE (BLOQUEAR si período está pagado/bloqueado)
CREATE POLICY "loads_update_immutable_after_payment" ON loads
FOR UPDATE USING (
  auth.role() = 'authenticated' AND
  auth.uid() IS NOT NULL AND
  COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false AND
  (
    driver_user_id = auth.uid() OR
    (driver_user_id IS NULL AND created_by = auth.uid()) OR
    payment_period_id IN (
      SELECT cpp.id FROM company_payment_periods cpp
      JOIN user_company_roles ucr ON cpp.company_id = ucr.company_id
      WHERE ucr.user_id = auth.uid() AND ucr.is_active = true
    )
  ) AND
  -- PROTECCIÓN CRÍTICA: Impedir modificaciones si período está bloqueado
  (payment_period_id IS NULL OR NOT is_payment_period_locked(payment_period_id))
);

-- Política para DELETE (BLOQUEAR si período está pagado/bloqueado)
CREATE POLICY "loads_delete_immutable_after_payment" ON loads
FOR DELETE USING (
  auth.role() = 'authenticated' AND
  auth.uid() IS NOT NULL AND
  COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false AND
  (
    driver_user_id = auth.uid() OR
    (driver_user_id IS NULL AND created_by = auth.uid()) OR
    payment_period_id IN (
      SELECT cpp.id FROM company_payment_periods cpp
      JOIN user_company_roles ucr ON cpp.company_id = ucr.company_id
      WHERE ucr.user_id = auth.uid() AND ucr.is_active = true
    )
  ) AND
  -- PROTECCIÓN CRÍTICA: Impedir eliminaciones si período está bloqueado
  (payment_period_id IS NULL OR NOT is_payment_period_locked(payment_period_id))
);

-- ===================================================================
-- 3. PROTECCIÓN DE GASTOS/DEDUCCIONES (EXPENSE_INSTANCES)
-- ===================================================================

-- Verificar políticas existentes para expense_instances
DROP POLICY IF EXISTS "Company admins can insert expense_instances" ON expense_instances;
DROP POLICY IF EXISTS "Company admins can update expense_instances" ON expense_instances;
DROP POLICY IF EXISTS "Company admins can delete expense_instances" ON expense_instances;

-- Política INSERT para expense_instances
CREATE POLICY "expense_instances_insert_access" ON expense_instances
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL AND
  auth.role() = 'authenticated' AND
  COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false AND
  payment_period_id IN (
    SELECT dpc.id FROM driver_period_calculations dpc
    JOIN company_payment_periods cpp ON dpc.company_payment_period_id = cpp.id
    JOIN user_company_roles ucr ON cpp.company_id = ucr.company_id
    WHERE ucr.user_id = auth.uid() AND ucr.is_active = true AND
          ucr.role = ANY(ARRAY['company_owner'::user_role, 'operations_manager'::user_role, 'superadmin'::user_role])
  )
);

-- Política UPDATE para expense_instances (BLOQUEAR si período pagado)
CREATE POLICY "expense_instances_update_immutable_after_payment" ON expense_instances
FOR UPDATE USING (
  auth.uid() IS NOT NULL AND
  auth.role() = 'authenticated' AND
  COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false AND
  payment_period_id IN (
    SELECT dpc.id FROM driver_period_calculations dpc
    JOIN company_payment_periods cpp ON dpc.company_payment_period_id = cpp.id
    JOIN user_company_roles ucr ON cpp.company_id = ucr.company_id
    WHERE ucr.user_id = auth.uid() AND ucr.is_active = true AND
          ucr.role = ANY(ARRAY['company_owner'::user_role, 'operations_manager'::user_role, 'superadmin'::user_role]) AND
          -- PROTECCIÓN CRÍTICA: No modificar si período bloqueado
          NOT cpp.is_locked
  )
);

-- Política DELETE para expense_instances (BLOQUEAR si período pagado)
CREATE POLICY "expense_instances_delete_immutable_after_payment" ON expense_instances
FOR DELETE USING (
  auth.uid() IS NOT NULL AND
  auth.role() = 'authenticated' AND
  COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false AND
  payment_period_id IN (
    SELECT dpc.id FROM driver_period_calculations dpc
    JOIN company_payment_periods cpp ON dpc.company_payment_period_id = cpp.id
    JOIN user_company_roles ucr ON cpp.company_id = ucr.company_id
    WHERE ucr.user_id = auth.uid() AND ucr.is_active = true AND
          ucr.role = ANY(ARRAY['company_owner'::user_role, 'operations_manager'::user_role, 'superadmin'::user_role]) AND
          -- PROTECCIÓN CRÍTICA: No eliminar si período bloqueado
          NOT cpp.is_locked
  )
);

-- ===================================================================
-- 4. VERIFICAR Y MEJORAR PROTECCIÓN DRIVER_PERIOD_CALCULATIONS
-- ===================================================================

-- Actualizar política de UPDATE para driver_period_calculations
DROP POLICY IF EXISTS "Driver period calculations update policy" ON driver_period_calculations;
CREATE POLICY "driver_period_calculations_update_secure" ON driver_period_calculations
FOR UPDATE USING (
  auth.role() = 'authenticated' AND
  auth.uid() IS NOT NULL AND
  COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false AND
  company_payment_period_id IN (
    SELECT cpp.id FROM company_payment_periods cpp
    JOIN user_company_roles ucr ON cpp.company_id = ucr.company_id
    WHERE ucr.user_id = auth.uid() AND ucr.is_active = true AND
          -- PROTECCIÓN ADICIONAL: Solo admins pueden modificar cálculos
          ucr.role = ANY(ARRAY['company_owner'::user_role, 'operations_manager'::user_role, 'superadmin'::user_role])
  )
);

-- ===================================================================
-- 5. TRIGGER PARA BLOQUEO AUTOMÁTICO AL MARCAR COMO PAGADO
-- ===================================================================

-- Función que bloquea automáticamente el período cuando todos están pagados
CREATE OR REPLACE FUNCTION public.auto_lock_period_when_all_paid()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  pending_count integer;
  period_id uuid;
BEGIN
  -- Obtener el período del cálculo actualizado
  period_id := NEW.company_payment_period_id;
  
  -- Si el estado cambió a 'paid', verificar si todos están pagados
  IF NEW.payment_status = 'paid' AND (OLD.payment_status IS NULL OR OLD.payment_status != 'paid') THEN
    -- Contar conductores pendientes en este período
    SELECT COUNT(*) INTO pending_count
    FROM driver_period_calculations dpc
    WHERE dpc.company_payment_period_id = period_id
      AND (dpc.payment_status IS NULL OR dpc.payment_status != 'paid');
    
    -- Si no hay pendientes, bloquear el período automáticamente
    IF pending_count = 0 THEN
      UPDATE company_payment_periods
      SET is_locked = true,
          locked_at = now(),
          locked_by = auth.uid(),
          status = 'closed'
      WHERE id = period_id AND NOT is_locked;
      
      -- Log del bloqueo automático
      INSERT INTO archive_logs (
        operation_type,
        table_name,
        details,
        triggered_by
      ) VALUES (
        'AUTO_LOCK',
        'company_payment_periods',
        jsonb_build_object(
          'period_id', period_id,
          'reason', 'All drivers paid',
          'locked_by', auth.uid()
        ),
        'auto_lock_trigger'
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Crear trigger para bloqueo automático
DROP TRIGGER IF EXISTS trigger_auto_lock_period ON driver_period_calculations;
CREATE TRIGGER trigger_auto_lock_period
  AFTER UPDATE ON driver_period_calculations
  FOR EACH ROW
  EXECUTE FUNCTION auto_lock_period_when_all_paid();

-- ===================================================================
-- 6. FUNCIÓN DE VALIDACIÓN PARA USO EN APLICACIÓN
-- ===================================================================

-- Función para verificar si se pueden modificar datos financieros
CREATE OR REPLACE FUNCTION public.can_modify_financial_data(period_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  is_locked boolean;
  paid_drivers integer;
  total_drivers integer;
  result jsonb;
BEGIN
  -- Verificar si el período está bloqueado
  SELECT COALESCE(cpp.is_locked, false), 
         COUNT(*) FILTER (WHERE dpc.payment_status = 'paid'),
         COUNT(*)
  INTO is_locked, paid_drivers, total_drivers
  FROM company_payment_periods cpp
  LEFT JOIN driver_period_calculations dpc ON cpp.id = dpc.company_payment_period_id
  WHERE cpp.id = period_id
  GROUP BY cpp.is_locked;
  
  result := jsonb_build_object(
    'can_modify', NOT COALESCE(is_locked, false),
    'is_locked', COALESCE(is_locked, false),
    'paid_drivers', COALESCE(paid_drivers, 0),
    'total_drivers', COALESCE(total_drivers, 0),
    'warning_message', CASE 
      WHEN is_locked THEN 'Período bloqueado: No se pueden modificar datos financieros'
      WHEN paid_drivers > 0 THEN 'Precaución: ' || paid_drivers || ' conductor(es) ya pagado(s)'
      ELSE 'Período activo: Se pueden modificar datos'
    END
  );
  
  RETURN result;
END;
$$;

-- ===================================================================
-- 7. COMENTARIOS Y DOCUMENTACIÓN
-- ===================================================================

COMMENT ON FUNCTION public.is_payment_period_locked(uuid) IS 
'Verifica si un período de pago está bloqueado para modificaciones';

COMMENT ON FUNCTION public.auto_lock_period_when_all_paid() IS 
'Bloquea automáticamente un período cuando todos los conductores han sido pagados';

COMMENT ON FUNCTION public.can_modify_financial_data(uuid) IS 
'Verifica si se pueden modificar datos financieros en un período específico';

-- ===================================================================
-- 8. ÍNDICES PARA OPTIMIZACIÓN
-- ===================================================================

-- Índice para consultas de bloqueo de períodos
CREATE INDEX IF NOT EXISTS idx_company_payment_periods_locked_status 
ON company_payment_periods(is_locked, status) WHERE is_locked = true;

-- Índice para consultas de estado de pago de conductores
CREATE INDEX IF NOT EXISTS idx_driver_calculations_payment_status 
ON driver_period_calculations(company_payment_period_id, payment_status) 
WHERE payment_status = 'paid';

-- ===================================================================
-- SISTEMA DE INTEGRIDAD FINANCIERA IMPLEMENTADO
-- ===================================================================