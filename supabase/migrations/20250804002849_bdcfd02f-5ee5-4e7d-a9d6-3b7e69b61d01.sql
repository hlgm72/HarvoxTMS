-- Primero, eliminar y recrear los triggers que referencian driver_user_id
-- Buscar triggers relacionados con other_income y eliminarlos temporalmente

-- Drop triggers que pueden estar causando problemas
DROP TRIGGER IF EXISTS auto_recalculate_on_other_income ON public.other_income;

-- Verificar si hay función que necesita ser actualizada
DROP FUNCTION IF EXISTS public.auto_recalculate_driver_period_totals() CASCADE;

-- Ahora continuar con la refactorización
-- 1. Agregar columna para el rol del usuario
ALTER TABLE public.other_income 
ADD COLUMN IF NOT EXISTS applied_to_role user_role;

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
  -- Asignar payment_period_id como NULL para que sea asignado automáticamente
  NULL,
  'dispatcher'::user_role
FROM public.dispatcher_other_income
WHERE NOT EXISTS (
  SELECT 1 FROM public.other_income oi 
  WHERE oi.user_id = dispatcher_other_income.dispatcher_user_id
  AND oi.income_date = dispatcher_other_income.income_date
  AND oi.amount = dispatcher_other_income.amount
  AND oi.description = dispatcher_other_income.description
);

-- 4. Actualizar registros existentes de other_income para marcarlos como de conductores
UPDATE public.other_income 
SET applied_to_role = 'driver'::user_role 
WHERE applied_to_role IS NULL;

-- 5. Hacer la columna applied_to_role NOT NULL ahora que tiene datos
ALTER TABLE public.other_income 
ALTER COLUMN applied_to_role SET NOT NULL;

-- 6. Eliminar la tabla dispatcher_other_income
DROP TABLE IF EXISTS public.dispatcher_other_income CASCADE;

-- 7. Recrear el trigger actualizado para other_income
CREATE OR REPLACE FUNCTION public.auto_recalculate_on_other_income()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  target_period_id UUID;
  target_user_id UUID;
BEGIN
  target_user_id := COALESCE(NEW.user_id, OLD.user_id);
  target_period_id := COALESCE(NEW.payment_period_id, OLD.payment_period_id);
  
  IF target_user_id IS NOT NULL AND target_period_id IS NOT NULL THEN
    PERFORM recalculate_payment_period_totals(target_period_id);
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Crear el trigger actualizado
CREATE TRIGGER auto_recalculate_on_other_income
  AFTER INSERT OR UPDATE OR DELETE ON public.other_income
  FOR EACH ROW EXECUTE FUNCTION public.auto_recalculate_on_other_income();

-- 8. Actualizar las RLS policies para other_income
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