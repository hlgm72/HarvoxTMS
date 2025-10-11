-- ===============================================
-- 🚨 RECREAR RLS POLICIES PARA LOADS (Adaptadas a nueva estructura)
-- ===============================================

-- Policy para SELECT: Los usuarios pueden ver loads de su empresa
CREATE POLICY "loads_select_company_access"
ON loads
FOR SELECT
USING (
  auth.role() = 'authenticated'
  AND auth.uid() IS NOT NULL
  AND NOT COALESCE((auth.jwt()->>'is_anonymous')::boolean, false)
  AND (
    -- El usuario es el conductor de la carga
    driver_user_id = auth.uid()
    OR
    -- El usuario pertenece a la misma empresa que el conductor
    driver_user_id IN (
      SELECT ucr.user_id
      FROM user_company_roles ucr
      WHERE ucr.company_id IN (
        SELECT ucr2.company_id
        FROM user_company_roles ucr2
        WHERE ucr2.user_id = auth.uid()
        AND ucr2.is_active = true
      )
      AND ucr.is_active = true
    )
    OR
    -- El usuario creó la carga
    created_by = auth.uid()
  )
);

-- Policy para INSERT: Solo managers y owners pueden crear loads
CREATE POLICY "loads_insert_company_managers"
ON loads
FOR INSERT
WITH CHECK (
  auth.role() = 'authenticated'
  AND auth.uid() IS NOT NULL
  AND NOT COALESCE((auth.jwt()->>'is_anonymous')::boolean, false)
  AND EXISTS (
    SELECT 1 FROM user_company_roles ucr
    WHERE ucr.user_id = auth.uid()
    AND ucr.is_active = true
    AND ucr.role IN ('company_owner', 'operations_manager', 'dispatcher', 'superadmin')
  )
);

-- Policy para UPDATE: Solo se puede actualizar si el período NO está locked
CREATE POLICY "loads_update_if_period_not_locked"
ON loads
FOR UPDATE
USING (
  auth.role() = 'authenticated'
  AND auth.uid() IS NOT NULL
  AND NOT COALESCE((auth.jwt()->>'is_anonymous')::boolean, false)
  AND (
    driver_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM user_company_roles ucr
      WHERE ucr.user_id = auth.uid()
      AND ucr.is_active = true
      AND ucr.role IN ('company_owner', 'operations_manager', 'dispatcher', 'superadmin')
    )
  )
  AND (
    -- Verificar que el período no esté bloqueado
    payment_period_id IS NULL
    OR NOT EXISTS (
      SELECT 1 
      FROM user_payment_periods upp
      JOIN company_payment_periods cpp ON upp.company_payment_period_id = cpp.id
      WHERE upp.id = loads.payment_period_id
      AND cpp.is_locked = true
    )
  )
)
WITH CHECK (
  auth.role() = 'authenticated'
  AND auth.uid() IS NOT NULL
  AND NOT COALESCE((auth.jwt()->>'is_anonymous')::boolean, false)
);

-- Policy para DELETE: Similar a UPDATE, solo si no está locked
CREATE POLICY "loads_delete_if_period_not_locked"
ON loads
FOR DELETE
USING (
  auth.role() = 'authenticated'
  AND auth.uid() IS NOT NULL
  AND NOT COALESCE((auth.jwt()->>'is_anonymous')::boolean, false)
  AND EXISTS (
    SELECT 1 FROM user_company_roles ucr
    WHERE ucr.user_id = auth.uid()
    AND ucr.is_active = true
    AND ucr.role IN ('company_owner', 'operations_manager', 'dispatcher', 'superadmin')
  )
  AND (
    payment_period_id IS NULL
    OR NOT EXISTS (
      SELECT 1 
      FROM user_payment_periods upp
      JOIN company_payment_periods cpp ON upp.company_payment_period_id = cpp.id
      WHERE upp.id = loads.payment_period_id
      AND cpp.is_locked = true
    )
  )
);

-- Log
INSERT INTO migration_audit_log (phase, operation, status)
VALUES ('rls_recreation', 'loads_policies_recreated', 'completed');