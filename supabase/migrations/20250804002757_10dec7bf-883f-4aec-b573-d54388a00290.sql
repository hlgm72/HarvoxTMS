-- Refactorizar pagos adicionales: unificar en other_income
-- 1. Agregar columna para el rol del usuario
ALTER TABLE public.other_income 
ADD COLUMN applied_to_role user_role;

-- 2. Renombrar driver_user_id a user_id
ALTER TABLE public.other_income 
RENAME COLUMN driver_user_id TO user_id;

-- 3. Migrar datos de dispatcher_other_income a other_income (si existen)
INSERT INTO public.other_income (
  user_id,
  income_type,
  description,
  amount,
  income_date,
  status,
  reference_number,
  notes,
  approved_by,
  approved_at,
  created_by,
  created_at,
  updated_at,
  payment_period_id,
  applied_to_role
)
SELECT 
  dispatcher_user_id,
  income_type,
  description,
  amount,
  income_date,
  status,
  reference_number,
  notes,
  approved_by,
  approved_at,
  created_by,
  created_at,
  updated_at,
  -- Generar payment_period_id basado en el usuario y fecha
  (SELECT dpc.id 
   FROM driver_period_calculations dpc
   JOIN company_payment_periods cpp ON dpc.company_payment_period_id = cpp.id
   WHERE dpc.driver_user_id = dispatcher_user_id
   AND income_date BETWEEN cpp.period_start_date AND cpp.period_end_date
   LIMIT 1),
  'dispatcher'::user_role
FROM public.dispatcher_other_income;

-- 4. Actualizar registros existentes de other_income para marcarlos como de conductores
UPDATE public.other_income 
SET applied_to_role = 'driver'::user_role 
WHERE applied_to_role IS NULL;

-- 5. Hacer la columna applied_to_role NOT NULL ahora que tiene datos
ALTER TABLE public.other_income 
ALTER COLUMN applied_to_role SET NOT NULL;

-- 6. Eliminar la tabla dispatcher_other_income
DROP TABLE public.dispatcher_other_income CASCADE;

-- 7. Actualizar las RLS policies para other_income
DROP POLICY IF EXISTS "other_income_delete" ON public.other_income;
DROP POLICY IF EXISTS "other_income_insert" ON public.other_income;
DROP POLICY IF EXISTS "other_income_select" ON public.other_income;
DROP POLICY IF EXISTS "other_income_update" ON public.other_income;

-- Políticas RLS actualizadas para la tabla unificada
CREATE POLICY "other_income_select" ON public.other_income
FOR SELECT USING (
  auth.uid() IS NOT NULL AND
  COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false AND
  (
    -- Los usuarios pueden ver sus propios ingresos
    user_id = auth.uid() OR
    -- Los administradores de la empresa pueden ver todos los ingresos de su empresa
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

CREATE POLICY "other_income_insert" ON public.other_income
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL AND
  COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false AND
  (
    -- Los usuarios pueden crear sus propios ingresos
    user_id = auth.uid() OR
    -- Los administradores pueden crear ingresos para usuarios de su empresa
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

CREATE POLICY "other_income_update" ON public.other_income
FOR UPDATE USING (
  auth.uid() IS NOT NULL AND
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
) WITH CHECK (
  auth.uid() IS NOT NULL AND
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

CREATE POLICY "other_income_delete" ON public.other_income
FOR DELETE USING (
  auth.uid() IS NOT NULL AND
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