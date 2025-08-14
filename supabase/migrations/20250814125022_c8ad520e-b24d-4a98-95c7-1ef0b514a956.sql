-- Primero, eliminar la política actual que está causando problemas
DROP POLICY IF EXISTS "Users can view expense_instances for their company" ON expense_instances;

-- Crear una nueva política RLS más específica para expense_instances
CREATE POLICY "Users can view expense_instances for their company drivers" 
ON expense_instances 
FOR SELECT 
USING (
  -- El usuario debe estar autenticado
  require_authenticated_user() 
  AND (
    -- El usuario es el dueño del expense_instance
    user_id = auth.uid()
    OR
    -- O el usuario tiene permisos en la empresa del conductor
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

-- También agregar políticas para otras operaciones si es necesario
CREATE POLICY "Company admins can insert expense_instances" 
ON expense_instances 
FOR INSERT 
WITH CHECK (
  require_authenticated_user() 
  AND payment_period_id IN (
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
  require_authenticated_user() 
  AND payment_period_id IN (
    SELECT dpc.id
    FROM driver_period_calculations dpc
    JOIN company_payment_periods cpp ON dpc.company_payment_period_id = cpp.id
    JOIN user_company_roles ucr ON cpp.company_id = ucr.company_id
    WHERE ucr.user_id = auth.uid() 
    AND ucr.is_active = true
    AND ucr.role IN ('company_owner', 'operations_manager', 'superadmin')
  )
);

CREATE POLICY "Company admins can delete expense_instances" 
ON expense_instances 
FOR DELETE 
USING (
  require_authenticated_user() 
  AND payment_period_id IN (
    SELECT dpc.id
    FROM driver_period_calculations dpc
    JOIN company_payment_periods cpp ON dpc.company_payment_period_id = cpp.id
    JOIN user_company_roles ucr ON cpp.company_id = ucr.company_id
    WHERE ucr.user_id = auth.uid() 
    AND ucr.is_active = true
    AND ucr.role IN ('company_owner', 'operations_manager', 'superadmin')
  )
);