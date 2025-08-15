-- Arreglar políticas RLS que permiten acceso anónimo

-- 1. Actualizar políticas de expense_instances para prevenir acceso anónimo
-- Primero eliminar las políticas existentes problemáticas
DROP POLICY IF EXISTS "Company admins can delete expense_instances" ON expense_instances;
DROP POLICY IF EXISTS "Company admins can update expense_instances" ON expense_instances;
DROP POLICY IF EXISTS "Users can view expense_instances for their company drivers" ON expense_instances;

-- Crear nuevas políticas más seguras que explícitamente excluyen usuarios anónimos
CREATE POLICY "Company admins can delete expense_instances" 
ON expense_instances 
FOR DELETE 
USING (
  auth.uid() IS NOT NULL AND 
  auth.role() = 'authenticated' AND
  COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false AND
  payment_period_id IN (
    SELECT dpc.id
    FROM driver_period_calculations dpc
    JOIN company_payment_periods cpp ON dpc.company_payment_period_id = cpp.id
    JOIN user_company_roles ucr ON cpp.company_id = ucr.company_id
    WHERE ucr.user_id = auth.uid() 
    AND ucr.is_active = true 
    AND ucr.role IN ('company_owner', 'operations_manager', 'superadmin')
  )
);

CREATE POLICY "Company admins can insert expense_instances" 
ON expense_instances 
FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL AND 
  auth.role() = 'authenticated' AND
  COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false AND
  payment_period_id IN (
    SELECT dpc.id
    FROM driver_period_calculations dpc
    JOIN company_payment_periods cpp ON dpc.company_payment_period_id = cpp.id
    JOIN user_company_roles ucr ON cpp.company_id = ucr.company_id
    WHERE ucr.user_id = auth.uid() 
    AND ucr.is_active = true 
    AND ucr.role IN ('company_owner', 'operations_manager', 'superadmin')
  )
);

CREATE POLICY "Company admins can update expense_instances" 
ON expense_instances 
FOR UPDATE 
USING (
  auth.uid() IS NOT NULL AND 
  auth.role() = 'authenticated' AND
  COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false AND
  payment_period_id IN (
    SELECT dpc.id
    FROM driver_period_calculations dpc
    JOIN company_payment_periods cpp ON dpc.company_payment_period_id = cpp.id
    JOIN user_company_roles ucr ON cpp.company_id = ucr.company_id
    WHERE ucr.user_id = auth.uid() 
    AND ucr.is_active = true 
    AND ucr.role IN ('company_owner', 'operations_manager', 'superadmin')
  )
);

CREATE POLICY "Users can view expense_instances for their company drivers" 
ON expense_instances 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND 
  auth.role() = 'authenticated' AND
  COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false AND
  (
    user_id = auth.uid() OR 
    payment_period_id IN (
      SELECT dpc.id
      FROM driver_period_calculations dpc
      JOIN company_payment_periods cpp ON dpc.company_payment_period_id = cpp.id
      JOIN user_company_roles ucr ON cpp.company_id = ucr.company_id
      WHERE ucr.user_id = auth.uid() 
      AND ucr.is_active = true 
      AND ucr.role IN ('company_owner', 'operations_manager', 'superadmin')
    )
  )
);