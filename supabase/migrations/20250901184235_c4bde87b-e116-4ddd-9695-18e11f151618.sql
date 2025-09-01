-- Crear política RLS que permita a las funciones del sistema crear deducciones por porcentaje
CREATE POLICY "System functions can create percentage deductions"
ON public.expense_instances
FOR INSERT
WITH CHECK (
  -- Permitir inserts para deducciones por porcentaje desde funciones del sistema
  EXISTS (
    SELECT 1 FROM expense_types et
    WHERE et.id = expense_type_id
      AND et.category = 'percentage_deduction'
  )
  OR
  -- Mantener la política original para otros casos
  (
    auth.uid() IS NOT NULL 
    AND auth.role() = 'authenticated' 
    AND COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false 
    AND payment_period_id IN (
      SELECT dpc.id
      FROM driver_period_calculations dpc
      JOIN company_payment_periods cpp ON dpc.company_payment_period_id = cpp.id
      JOIN user_company_roles ucr ON cpp.company_id = ucr.company_id
      WHERE ucr.user_id = auth.uid() 
        AND ucr.is_active = true 
        AND ucr.role = ANY(ARRAY['company_owner'::user_role, 'operations_manager'::user_role, 'superadmin'::user_role])
    )
  )
);

-- Ahora ejecutar la generación de deducciones retroactivas
SELECT generate_deductions_for_existing_loads_safe() as result;