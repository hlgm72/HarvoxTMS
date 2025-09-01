-- ===============================================
-- 🚀 OPTIMIZACIÓN DE POLÍTICAS RLS - EXPENSE_INSTANCES
-- ===============================================
-- Arreglar problemas de rendimiento identificados por el linter

-- 1. Eliminar políticas duplicadas que causan problemas de rendimiento
DROP POLICY IF EXISTS "System functions can create percentage deductions" ON public.expense_instances;
DROP POLICY IF EXISTS "expense_instances_insert_access" ON public.expense_instances;

-- 2. Crear una política única optimizada que combina ambas funcionalidades
CREATE POLICY "expense_instances_optimized_insert_policy" 
ON public.expense_instances 
FOR INSERT 
WITH CHECK (
  -- OPTIMIZACIÓN: Usar (SELECT auth.uid()) en lugar de auth.uid() directo
  (SELECT auth.uid()) IS NOT NULL AND
  (SELECT auth.role()) = 'authenticated' AND
  COALESCE(((SELECT auth.jwt())->> 'is_anonymous')::boolean, false) = false AND
  (
    -- Permitir inserción de deducciones por porcentaje (funciones del sistema)
    EXISTS (
      SELECT 1 FROM expense_types et
      WHERE et.id = expense_instances.expense_type_id 
      AND et.category = 'percentage_deduction'
    )
    OR
    -- Permitir inserción por administradores de empresa
    payment_period_id IN (
      SELECT dpc.id 
      FROM driver_period_calculations dpc
      JOIN company_payment_periods cpp ON dpc.company_payment_period_id = cpp.id
      JOIN user_company_roles ucr ON cpp.company_id = ucr.company_id
      WHERE ucr.user_id = (SELECT auth.uid()) 
      AND ucr.is_active = true 
      AND ucr.role = ANY(ARRAY['company_owner'::user_role, 'operations_manager'::user_role, 'superadmin'::user_role])
    )
  )
);

-- 3. Optimizar la política SELECT también para mejorar rendimiento
DROP POLICY IF EXISTS "Users can view expense_instances for their company drivers" ON public.expense_instances;

CREATE POLICY "expense_instances_optimized_select_policy"
ON public.expense_instances
FOR SELECT
USING (
  -- OPTIMIZACIÓN: Usar (SELECT auth.uid()) para mejorar rendimiento
  (SELECT auth.uid()) IS NOT NULL AND
  (SELECT auth.role()) = 'authenticated' AND
  COALESCE(((SELECT auth.jwt())->> 'is_anonymous')::boolean, false) = false AND
  (
    -- El usuario puede ver sus propios gastos
    user_id = (SELECT auth.uid())
    OR
    -- Los administradores pueden ver gastos de conductores de su empresa
    payment_period_id IN (
      SELECT dpc.id 
      FROM driver_period_calculations dpc
      JOIN company_payment_periods cpp ON dpc.company_payment_period_id = cpp.id
      JOIN user_company_roles ucr ON cpp.company_id = ucr.company_id
      WHERE ucr.user_id = (SELECT auth.uid()) 
      AND ucr.is_active = true 
      AND ucr.role = ANY(ARRAY['company_owner'::user_role, 'operations_manager'::user_role, 'superadmin'::user_role])
    )
  )
);

-- 4. Optimizar la política DELETE
DROP POLICY IF EXISTS "expense_instances_delete_protected_by_payment_status" ON public.expense_instances;

CREATE POLICY "expense_instances_optimized_delete_policy"
ON public.expense_instances
FOR DELETE
USING (
  -- OPTIMIZACIÓN: Usar (SELECT auth.uid()) para mejorar rendimiento
  (SELECT auth.uid()) IS NOT NULL AND
  (SELECT auth.role()) = 'authenticated' AND
  COALESCE(((SELECT auth.jwt())->> 'is_anonymous')::boolean, false) = false AND
  -- Solo administradores pueden eliminar
  payment_period_id IN (
    SELECT dpc.id 
    FROM driver_period_calculations dpc
    JOIN company_payment_periods cpp ON dpc.company_payment_period_id = cpp.id
    JOIN user_company_roles ucr ON cpp.company_id = ucr.company_id
    WHERE ucr.user_id = (SELECT auth.uid()) 
    AND ucr.is_active = true 
    AND ucr.role = ANY(ARRAY['company_owner'::user_role, 'operations_manager'::user_role, 'superadmin'::user_role])
  ) AND
  -- No se puede eliminar si el conductor ya está pagado
  NOT is_driver_paid_in_period(
    user_id, 
    (SELECT cpp.id 
     FROM driver_period_calculations dpc
     JOIN company_payment_periods cpp ON dpc.company_payment_period_id = cpp.id
     WHERE dpc.id = expense_instances.payment_period_id)
  )
);

-- 5. Verificar que las políticas se crearon correctamente
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual IS NOT NULL as has_using,
  with_check IS NOT NULL as has_with_check
FROM pg_policies 
WHERE tablename = 'expense_instances' 
AND schemaname = 'public'
ORDER BY policyname;