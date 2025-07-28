-- Migración: Cambiar fuel_expenses.payment_period_id para referenciar company_payment_periods

-- Paso 1: Agregar nueva columna temporal
ALTER TABLE public.fuel_expenses 
ADD COLUMN company_payment_period_id UUID;

-- Paso 2: Poblar la nueva columna con los datos correctos
UPDATE public.fuel_expenses 
SET company_payment_period_id = dpc.company_payment_period_id
FROM public.driver_period_calculations dpc
WHERE public.fuel_expenses.payment_period_id = dpc.id;

-- Paso 3: Verificar que todos los registros tengan el nuevo campo poblado
-- (Los registros con payment_period_id NULL quedarán NULL en company_payment_period_id)

-- Paso 4: Eliminar la columna antigua
ALTER TABLE public.fuel_expenses 
DROP COLUMN payment_period_id;

-- Paso 5: Renombrar la nueva columna
ALTER TABLE public.fuel_expenses 
RENAME COLUMN company_payment_period_id TO payment_period_id;

-- Paso 6: Agregar constraint NOT NULL (ya que es requerido)
ALTER TABLE public.fuel_expenses 
ALTER COLUMN payment_period_id SET NOT NULL;

-- Paso 7: Agregar foreign key constraint
ALTER TABLE public.fuel_expenses 
ADD CONSTRAINT fk_fuel_expenses_payment_period 
FOREIGN KEY (payment_period_id) 
REFERENCES public.company_payment_periods(id) 
ON DELETE RESTRICT;

-- Paso 8: Crear índice para mejor performance
CREATE INDEX IF NOT EXISTS idx_fuel_expenses_payment_period_id 
ON public.fuel_expenses(payment_period_id);

-- Paso 9: Actualizar las políticas RLS para usar la nueva estructura
DROP POLICY IF EXISTS "Company admins can insert fuel expenses" ON public.fuel_expenses;
DROP POLICY IF EXISTS "Company users can update fuel expenses" ON public.fuel_expenses;
DROP POLICY IF EXISTS "Company users can view fuel expenses" ON public.fuel_expenses;
DROP POLICY IF EXISTS "Company admins can delete fuel expenses" ON public.fuel_expenses;

-- Nuevas políticas RLS simplificadas
CREATE POLICY "Company users can view fuel expenses" ON public.fuel_expenses
FOR SELECT USING (
  auth.role() = 'authenticated' AND
  auth.uid() IS NOT NULL AND
  (auth.jwt()->>'is_anonymous')::boolean IS FALSE AND
  (
    driver_user_id = auth.uid() OR
    payment_period_id IN (
      SELECT cpp.id FROM public.company_payment_periods cpp
      JOIN public.user_company_roles ucr ON cpp.company_id = ucr.company_id
      WHERE ucr.user_id = auth.uid() AND ucr.is_active = true
    )
  )
);

CREATE POLICY "Company admins can insert fuel expenses" ON public.fuel_expenses
FOR INSERT WITH CHECK (
  auth.role() = 'authenticated' AND
  auth.uid() IS NOT NULL AND
  (auth.jwt()->>'is_anonymous')::boolean IS FALSE AND
  payment_period_id IN (
    SELECT cpp.id FROM public.company_payment_periods cpp
    JOIN public.user_company_roles ucr ON cpp.company_id = ucr.company_id
    WHERE ucr.user_id = auth.uid() 
    AND ucr.is_active = true
    AND NOT cpp.is_locked
  )
);

CREATE POLICY "Company users can update fuel expenses" ON public.fuel_expenses
FOR UPDATE USING (
  auth.role() = 'authenticated' AND
  auth.uid() IS NOT NULL AND
  (auth.jwt()->>'is_anonymous')::boolean IS FALSE AND
  payment_period_id IN (
    SELECT cpp.id FROM public.company_payment_periods cpp
    JOIN public.user_company_roles ucr ON cpp.company_id = ucr.company_id
    WHERE ucr.user_id = auth.uid() 
    AND ucr.is_active = true
    AND NOT cpp.is_locked
  )
) WITH CHECK (
  auth.role() = 'authenticated' AND
  auth.uid() IS NOT NULL AND
  (auth.jwt()->>'is_anonymous')::boolean IS FALSE AND
  payment_period_id IN (
    SELECT cpp.id FROM public.company_payment_periods cpp
    JOIN public.user_company_roles ucr ON cpp.company_id = ucr.company_id
    WHERE ucr.user_id = auth.uid() 
    AND ucr.is_active = true
    AND NOT cpp.is_locked
  )
);

CREATE POLICY "Company admins can delete fuel expenses" ON public.fuel_expenses
FOR DELETE USING (
  auth.role() = 'authenticated' AND
  auth.uid() IS NOT NULL AND
  (auth.jwt()->>'is_anonymous')::boolean IS FALSE AND
  payment_period_id IN (
    SELECT cpp.id FROM public.company_payment_periods cpp
    JOIN public.user_company_roles ucr ON cpp.company_id = ucr.company_id
    WHERE ucr.user_id = auth.uid() 
    AND ucr.role IN ('company_owner', 'operations_manager', 'superadmin')
    AND ucr.is_active = true
    AND NOT cpp.is_locked
  )
);

-- Paso 10: Actualizar las funciones que referencian fuel_expenses
-- La función calculate_driver_payment_period necesita ser actualizada

CREATE OR REPLACE FUNCTION public.calculate_driver_payment_period(driver_calculation_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  calc_record RECORD;
  period_record RECORD;
  company_record RECORD;
  gross_income_amount NUMERIC := 0;
  other_income_amount NUMERIC := 0;
  fuel_expenses_amount NUMERIC := 0;
  total_income_amount NUMERIC := 0;
  total_deductions_amount NUMERIC := 0;
  current_balance NUMERIC := 0;
  expense_record RECORD;
  applied_expenses INTEGER := 0;
  deferred_expenses INTEGER := 0;
  alert_message TEXT := '';
  has_negative BOOLEAN := false;
  date_field TEXT;
  status_criteria TEXT;
BEGIN
  -- Obtener el cálculo del conductor
  SELECT * INTO calc_record 
  FROM public.driver_period_calculations 
  WHERE id = driver_calculation_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Cálculo no encontrado');
  END IF;
  
  -- Obtener información del período de la empresa
  SELECT * INTO period_record 
  FROM public.company_payment_periods 
  WHERE id = calc_record.company_payment_period_id;
  
  -- Obtener configuración de la empresa
  SELECT * INTO company_record
  FROM public.companies
  WHERE id = period_record.company_id;
  
  -- Determinar criterio de fecha y estados a incluir según configuración de empresa
  IF company_record.load_assignment_criteria = 'delivery_date' THEN
    date_field := 'delivery_date';
    status_criteria := 'delivered_completed_only'; -- Solo cargas completadas
  ELSE
    date_field := 'pickup_date';
    status_criteria := 'assigned_and_above'; -- Cargas asignadas y superiores
  END IF;
  
  -- 1. CALCULAR INGRESOS BRUTOS (cargas) según criterio de empresa
  IF status_criteria = 'delivered_completed_only' THEN
    -- Criterio tradicional: solo cargas entregadas/completadas
    SELECT COALESCE(SUM(
      l.total_amount - 
      COALESCE(l.total_amount * l.factoring_percentage / 100, 0) -
      COALESCE(l.total_amount * l.dispatching_percentage / 100, 0) -
      COALESCE(l.total_amount * l.leasing_percentage / 100, 0)
    ), 0) INTO gross_income_amount
    FROM public.loads l
    WHERE l.driver_user_id = calc_record.driver_user_id
    AND (
      (date_field = 'pickup_date' AND l.pickup_date >= period_record.period_start_date AND l.pickup_date <= period_record.period_end_date)
      OR
      (date_field = 'delivery_date' AND l.delivery_date >= period_record.period_start_date AND l.delivery_date <= period_record.period_end_date)
    )
    AND l.status IN ('delivered', 'completed');
  ELSE
    -- Criterio basado en pickup: incluir cargas asignadas y superiores
    SELECT COALESCE(SUM(
      l.total_amount - 
      COALESCE(l.total_amount * l.factoring_percentage / 100, 0) -
      COALESCE(l.total_amount * l.dispatching_percentage / 100, 0) -
      COALESCE(l.total_amount * l.leasing_percentage / 100, 0)
    ), 0) INTO gross_income_amount
    FROM public.loads l
    WHERE l.driver_user_id = calc_record.driver_user_id
    AND l.pickup_date >= period_record.period_start_date
    AND l.pickup_date <= period_record.period_end_date
    AND l.status IN ('assigned', 'in_transit', 'at_pickup', 'loaded', 'delivered', 'completed');
  END IF;
  
  -- 2. CALCULAR OTROS INGRESOS
  SELECT COALESCE(SUM(oi.amount), 0) INTO other_income_amount
  FROM public.other_income oi
  WHERE oi.driver_user_id = calc_record.driver_user_id
  AND oi.income_date >= period_record.period_start_date
  AND oi.income_date <= period_record.period_end_date
  AND oi.status = 'approved';
  
  -- 3. CALCULAR GASTOS DE COMBUSTIBLE (actualizado para usar nueva estructura)
  SELECT COALESCE(SUM(fe.total_amount), 0) INTO fuel_expenses_amount
  FROM public.fuel_expenses fe
  WHERE fe.driver_user_id = calc_record.driver_user_id
  AND fe.payment_period_id = period_record.id  -- Ahora referencia directamente company_payment_periods
  AND fe.status IN ('pending', 'approved', 'verified');
  
  -- 4. CALCULAR INGRESOS TOTALES
  total_income_amount := gross_income_amount + other_income_amount;
  current_balance := total_income_amount - fuel_expenses_amount;
  
  -- 5. APLICAR GASTOS POR PRIORIDAD
  -- Primero gastos críticos (siempre se aplican)
  FOR expense_record IN 
    SELECT * FROM public.expense_instances ei
    WHERE ei.payment_period_id = driver_calculation_id
    AND ei.status = 'planned'
    AND ei.is_critical = true
    ORDER BY ei.priority ASC, ei.amount ASC
  LOOP
    total_deductions_amount := total_deductions_amount + expense_record.amount;
    current_balance := current_balance - expense_record.amount;
    
    UPDATE public.expense_instances 
    SET status = 'applied', applied_at = now(), applied_by = auth.uid()
    WHERE id = expense_record.id;
    
    applied_expenses := applied_expenses + 1;
  END LOOP;
  
  -- Luego gastos normales (mientras haya balance positivo)
  FOR expense_record IN 
    SELECT * FROM public.expense_instances ei
    WHERE ei.payment_period_id = driver_calculation_id
    AND ei.status = 'planned'
    AND ei.is_critical = false
    ORDER BY ei.priority ASC, ei.amount ASC
  LOOP
    IF current_balance >= expense_record.amount THEN
      -- Aplicar el gasto
      total_deductions_amount := total_deductions_amount + expense_record.amount;
      current_balance := current_balance - expense_record.amount;
      
      UPDATE public.expense_instances 
      SET status = 'applied', applied_at = now(), applied_by = auth.uid()
      WHERE id = expense_record.id;
      
      applied_expenses := applied_expenses + 1;
    ELSE
      -- Diferir el gasto
      UPDATE public.expense_instances 
      SET status = 'deferred'
      WHERE id = expense_record.id;
      
      deferred_expenses := deferred_expenses + 1;
    END IF;
  END LOOP;
  
  -- 6. VERIFICAR BALANCE NEGATIVO Y GENERAR ALERTAS
  IF current_balance < 0 THEN
    has_negative := true;
    alert_message := 'Balance negativo: $' || ABS(current_balance)::TEXT || 
                    '. Revisar gastos críticos aplicados.';
  END IF;
  
  IF deferred_expenses > 0 THEN
    alert_message := alert_message || 
                    CASE WHEN alert_message != '' THEN ' ' ELSE '' END ||
                    deferred_expenses::TEXT || ' gastos diferidos por insuficiente balance.';
  END IF;
  
  -- Agregar nota sobre criterio usado
  IF status_criteria = 'assigned_and_above' THEN
    alert_message := alert_message || 
                    CASE WHEN alert_message != '' THEN ' ' ELSE '' END ||
                    'Cálculo basado en fecha de recogida (incluye cargas asignadas).';
  END IF;
  
  -- 7. ACTUALIZAR EL CÁLCULO
  UPDATE public.driver_period_calculations 
  SET 
    gross_earnings = gross_income_amount,
    other_income = other_income_amount,
    fuel_expenses = fuel_expenses_amount,
    total_income = total_income_amount,
    total_deductions = total_deductions_amount,
    net_payment = current_balance,
    has_negative_balance = has_negative,
    balance_alert_message = NULLIF(alert_message, ''),
    calculated_at = now(),
    calculated_by = auth.uid(),
    updated_at = now()
  WHERE id = driver_calculation_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'driver_calculation_id', driver_calculation_id,
    'gross_earnings', gross_income_amount,
    'other_income', other_income_amount,
    'fuel_expenses', fuel_expenses_amount,
    'total_income', total_income_amount,
    'total_deductions', total_deductions_amount,
    'net_payment', current_balance,
    'has_negative_balance', has_negative,
    'applied_expenses', applied_expenses,
    'deferred_expenses', deferred_expenses,
    'alert_message', alert_message,
    'calculation_criteria', CASE 
      WHEN status_criteria = 'assigned_and_above' THEN 'pickup_date_based'
      ELSE 'delivery_date_based'
    END
  );
END;
$function$;