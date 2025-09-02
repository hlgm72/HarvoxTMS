-- 🚨 CORRECCIÓN CRÍTICA: Ambigüedad en columna "is_locked"
-- Resolver paso a paso sin romper dependencias

-- Paso 1: Corregir la política DELETE de expense_instances para evitar ambigüedad
DROP POLICY IF EXISTS "expense_instances_optimized_delete_policy" ON public.expense_instances;

CREATE POLICY "expense_instances_optimized_delete_policy"
ON public.expense_instances
FOR DELETE
USING (
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
  -- No se puede eliminar si el conductor ya está pagado - ARREGLADO
  NOT is_driver_paid_in_period(
    user_id, 
    (SELECT dpc.company_payment_period_id 
     FROM driver_period_calculations dpc
     WHERE dpc.id = expense_instances.payment_period_id)
  )
);

-- Paso 2: Corregir la función de limpieza para ser más específica con las tablas
CREATE OR REPLACE FUNCTION public.is_payment_period_empty(period_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  has_loads BOOLEAN := FALSE;
  has_fuel BOOLEAN := FALSE;
  has_expenses BOOLEAN := FALSE;
  period_is_locked BOOLEAN := FALSE;
BEGIN
  -- Verificar si el período está bloqueado - especificar tabla claramente
  SELECT COALESCE(cpp.is_locked, false) INTO period_is_locked
  FROM company_payment_periods cpp
  WHERE cpp.id = period_id;
  
  -- No eliminar períodos bloqueados
  IF period_is_locked THEN
    RETURN FALSE;
  END IF;
  
  -- Verificar cargas
  SELECT EXISTS(
    SELECT 1 FROM loads l
    WHERE l.payment_period_id = period_id
  ) INTO has_loads;
  
  -- Verificar combustible  
  SELECT EXISTS(
    SELECT 1 FROM fuel_expenses fe
    WHERE fe.payment_period_id = period_id
  ) INTO has_fuel;
  
  -- Verificar deducciones/ingresos (via driver_period_calculations)
  SELECT EXISTS(
    SELECT 1 FROM expense_instances ei
    JOIN driver_period_calculations dpc ON ei.payment_period_id = dpc.id
    WHERE dpc.company_payment_period_id = period_id
  ) INTO has_expenses;
  
  -- El período está vacío si no tiene ningún tipo de transacción
  RETURN NOT (has_loads OR has_fuel OR has_expenses);
END;
$function$;

-- Paso 3: Mejorar la función cleanup_empty_payment_period con alias de tabla
CREATE OR REPLACE FUNCTION public.cleanup_empty_payment_period(period_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  period_info RECORD;
  calculations_deleted INTEGER := 0;
  period_deleted BOOLEAN := FALSE;
BEGIN
  -- Obtener información del período con alias claros
  SELECT 
    cpp.id,
    cpp.company_id,
    cpp.period_start_date,
    cpp.period_end_date,
    cpp.status,
    cpp.is_locked
  INTO period_info
  FROM company_payment_periods cpp
  WHERE cpp.id = period_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Período no encontrado'
    );
  END IF;
  
  -- Verificar si está vacío
  IF NOT is_payment_period_empty(period_id) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'El período no está vacío - contiene transacciones',
      'period_id', period_id
    );
  END IF;
  
  -- No eliminar períodos bloqueados o cerrados
  IF period_info.is_locked OR period_info.status IN ('closed', 'paid') THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'No se puede eliminar - período bloqueado o cerrado',
      'period_id', period_id,
      'status', period_info.status,
      'is_locked', period_info.is_locked
    );
  END IF;
  
  RAISE LOG 'Limpiando período vacío: % (fechas: % - %)', 
    period_id, period_info.period_start_date, period_info.period_end_date;
  
  -- 1. Eliminar cálculos de conductores huérfanos
  DELETE FROM driver_period_calculations dpc
  WHERE dpc.company_payment_period_id = period_id;
  
  GET DIAGNOSTICS calculations_deleted = ROW_COUNT;
  
  -- 2. Eliminar el período mismo
  DELETE FROM company_payment_periods cpp
  WHERE cpp.id = period_id;
  
  GET DIAGNOSTICS period_deleted = FOUND;
  
  RAISE LOG 'Período vacío eliminado: %, cálculos eliminados: %', 
    period_id, calculations_deleted;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Período vacío eliminado exitosamente',
    'period_id', period_id,
    'company_id', period_info.company_id,
    'period_dates', jsonb_build_object(
      'start_date', period_info.period_start_date,
      'end_date', period_info.period_end_date
    ),
    'calculations_deleted', calculations_deleted,
    'cleaned_at', now()
  );
  
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'Error limpiando período vacío %: %', period_id, SQLERRM;
  RETURN jsonb_build_object(
    'success', false,
    'message', 'Error limpiando período: ' || SQLERRM,
    'period_id', period_id
  );
END;
$function$;