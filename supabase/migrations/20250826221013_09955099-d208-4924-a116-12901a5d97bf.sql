-- ================================
-- TABLA PARA EXCLUSIONES TEMPORALES DE DEDUCCIONES RECURRENTES
-- ================================
CREATE TABLE IF NOT EXISTS public.recurring_expense_exclusions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  recurring_template_id UUID NOT NULL REFERENCES expense_recurring_templates(id) ON DELETE CASCADE,
  payment_period_id UUID NOT NULL REFERENCES company_payment_periods(id) ON DELETE CASCADE,
  excluded_by UUID NOT NULL,
  excluded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Constraint única para evitar duplicados
  UNIQUE(user_id, recurring_template_id, payment_period_id)
);

-- Habilitar RLS
ALTER TABLE public.recurring_expense_exclusions ENABLE ROW LEVEL SECURITY;

-- Política de acceso: solo usuarios de la misma empresa
CREATE POLICY "exclusions_company_access" ON public.recurring_expense_exclusions
FOR ALL USING (
  auth.uid() IS NOT NULL AND 
  NOT COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) AND
  payment_period_id IN (
    SELECT cpp.id 
    FROM company_payment_periods cpp
    JOIN user_company_roles ucr ON cpp.company_id = ucr.company_id
    WHERE ucr.user_id = auth.uid() 
    AND ucr.is_active = true
    AND ucr.role IN ('company_owner', 'operations_manager', 'superadmin')
  )
) WITH CHECK (
  auth.uid() IS NOT NULL AND 
  NOT COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) AND
  payment_period_id IN (
    SELECT cpp.id 
    FROM company_payment_periods cpp
    JOIN user_company_roles ucr ON cpp.company_id = ucr.company_id
    WHERE ucr.user_id = auth.uid() 
    AND ucr.is_active = true
    AND ucr.role IN ('company_owner', 'operations_manager', 'superadmin')
  )
);

-- ================================
-- FUNCIÓN PARA EXCLUIR UNA DEDUCCIÓN RECURRENTE DE UN PERÍODO
-- ================================
CREATE OR REPLACE FUNCTION public.exclude_recurring_expense_from_period(
  target_user_id UUID,
  template_id UUID,
  period_id UUID,
  exclusion_reason TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_user_id UUID;
  template_record RECORD;
  period_record RECORD;
  existing_instance_id UUID;
BEGIN
  -- Obtener usuario autenticado
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  -- Validar que la plantilla existe y pertenece al usuario
  SELECT * INTO template_record
  FROM expense_recurring_templates
  WHERE id = template_id AND user_id = target_user_id AND is_active = true;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Plantilla de deducción no encontrada o inactiva'
    );
  END IF;

  -- Validar que el período existe
  SELECT * INTO period_record
  FROM company_payment_periods
  WHERE id = period_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Período de pago no encontrado'
    );
  END IF;

  -- Verificar permisos del usuario en la empresa
  IF NOT EXISTS (
    SELECT 1 FROM user_company_roles ucr
    WHERE ucr.user_id = current_user_id
    AND ucr.company_id = period_record.company_id
    AND ucr.is_active = true
    AND ucr.role IN ('company_owner', 'operations_manager', 'superadmin')
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Sin permisos para gestionar deducciones en esta empresa'
    );
  END IF;

  -- Verificar si el período está bloqueado
  IF period_record.is_locked THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'No se puede modificar un período cerrado'
    );
  END IF;

  -- Insertar exclusión (si ya existe se ignora por UNIQUE constraint)
  INSERT INTO recurring_expense_exclusions (
    user_id,
    recurring_template_id,
    payment_period_id,
    excluded_by,
    reason
  ) VALUES (
    target_user_id,
    template_id,
    period_id,
    current_user_id,
    exclusion_reason
  )
  ON CONFLICT (user_id, recurring_template_id, payment_period_id) DO NOTHING;

  -- Eliminar instancia existente si ya fue generada
  DELETE FROM expense_instances
  WHERE user_id = target_user_id
  AND recurring_template_id = template_id
  AND payment_period_id = period_id
  AND status != 'paid'
  RETURNING id INTO existing_instance_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Deducción excluida del período exitosamente',
    'excluded_template', template_record.amount,
    'period_dates', jsonb_build_object(
      'start', period_record.period_start_date,
      'end', period_record.period_end_date
    ),
    'instance_removed', existing_instance_id IS NOT NULL,
    'excluded_by', current_user_id,
    'excluded_at', now()
  );

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Error excluyendo deducción: %', SQLERRM;
END;
$$;

-- ================================
-- FUNCIÓN PARA RESTAURAR UNA DEDUCCIÓN RECURRENTE A UN PERÍODO
-- ================================
CREATE OR REPLACE FUNCTION public.restore_recurring_expense_to_period(
  target_user_id UUID,
  template_id UUID,
  period_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_user_id UUID;
  template_record RECORD;
  period_record RECORD;
  exclusion_record RECORD;
  new_instance_id UUID;
BEGIN
  -- Obtener usuario autenticado
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  -- Validar que existe la exclusión
  SELECT * INTO exclusion_record
  FROM recurring_expense_exclusions
  WHERE user_id = target_user_id
  AND recurring_template_id = template_id
  AND payment_period_id = period_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'No existe exclusión para esta deducción en este período'
    );
  END IF;

  -- Obtener datos de la plantilla y período
  SELECT * INTO template_record
  FROM expense_recurring_templates
  WHERE id = template_id AND is_active = true;
  
  SELECT * INTO period_record
  FROM company_payment_periods
  WHERE id = period_id;

  -- Verificar permisos
  IF NOT EXISTS (
    SELECT 1 FROM user_company_roles ucr
    WHERE ucr.user_id = current_user_id
    AND ucr.company_id = period_record.company_id
    AND ucr.is_active = true
    AND ucr.role IN ('company_owner', 'operations_manager', 'superadmin')
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Sin permisos para gestionar deducciones en esta empresa'
    );
  END IF;

  -- Verificar si el período está bloqueado
  IF period_record.is_locked THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'No se puede modificar un período cerrado'
    );
  END IF;

  -- Eliminar la exclusión
  DELETE FROM recurring_expense_exclusions
  WHERE user_id = target_user_id
  AND recurring_template_id = template_id
  AND payment_period_id = period_id;

  -- Crear nueva instancia de gasto
  INSERT INTO expense_instances (
    user_id,
    expense_type_id,
    recurring_template_id,
    payment_period_id,
    amount,
    description,
    expense_date,
    status,
    applied_by,
    applied_at,
    created_by
  ) VALUES (
    target_user_id,
    template_record.expense_type_id,
    template_id,
    period_id,
    template_record.amount,
    'Deducción restaurada',
    CURRENT_DATE,
    'applied',
    current_user_id,
    now(),
    current_user_id
  )
  RETURNING id INTO new_instance_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Deducción restaurada al período exitosamente',
    'restored_template', template_record.amount,
    'new_instance_id', new_instance_id,
    'period_dates', jsonb_build_object(
      'start', period_record.period_start_date,
      'end', period_record.period_end_date
    ),
    'restored_by', current_user_id,
    'restored_at', now()
  );

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Error restaurando deducción: %', SQLERRM;
END;
$$;

-- ================================
-- ACTUALIZAR FUNCIÓN DE GENERACIÓN PARA CONSIDERAR EXCLUSIONES
-- ================================
CREATE OR REPLACE FUNCTION public.generate_recurring_expenses_for_period(period_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  period_record RECORD;
  template_record RECORD;
  instances_created INTEGER := 0;
  instances_skipped INTEGER := 0;
  exclusions_respected INTEGER := 0;
BEGIN
  -- Obtener información del período
  SELECT * INTO period_record
  FROM company_payment_periods
  WHERE id = period_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Período de pago no encontrado';
  END IF;

  -- Iterar por todas las plantillas recurrentes activas de usuarios en la empresa
  FOR template_record IN
    SELECT ret.*, ucr.user_id
    FROM expense_recurring_templates ret
    JOIN user_company_roles ucr ON ret.user_id = ucr.user_id
    WHERE ucr.company_id = period_record.company_id
    AND ucr.is_active = true
    AND ret.is_active = true
    AND ret.start_date <= period_record.period_end_date
    AND (ret.end_date IS NULL OR ret.end_date >= period_record.period_start_date)
  LOOP
    -- Verificar si esta deducción está excluida para este período
    IF EXISTS (
      SELECT 1 FROM recurring_expense_exclusions
      WHERE user_id = template_record.user_id
      AND recurring_template_id = template_record.id
      AND payment_period_id = period_id
    ) THEN
      exclusions_respected := exclusions_respected + 1;
      CONTINUE; -- Saltar esta plantilla
    END IF;

    -- Verificar si ya existe una instancia para este período y usuario
    IF EXISTS (
      SELECT 1 FROM expense_instances
      WHERE user_id = template_record.user_id
      AND recurring_template_id = template_record.id
      AND payment_period_id = period_id
    ) THEN
      instances_skipped := instances_skipped + 1;
      CONTINUE;
    END IF;

    -- Crear nueva instancia de gasto
    INSERT INTO expense_instances (
      user_id,
      expense_type_id,
      recurring_template_id,
      payment_period_id,
      amount,
      description,
      expense_date,
      status,
      applied_by,
      applied_at,
      created_by
    ) VALUES (
      template_record.user_id,
      template_record.expense_type_id,
      template_record.id,
      period_id,
      template_record.amount,
      'Deducción recurrente',
      COALESCE(period_record.period_start_date, CURRENT_DATE),
      'applied',
      auth.uid(),
      now(),
      auth.uid()
    );
    
    instances_created := instances_created + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'period_id', period_id,
    'instances_created', instances_created,
    'instances_skipped', instances_skipped,
    'exclusions_respected', exclusions_respected,
    'period_dates', jsonb_build_object(
      'start', period_record.period_start_date,
      'end', period_record.period_end_date
    ),
    'generated_at', now()
  );

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Error generando gastos recurrentes: %', SQLERRM;
END;
$$;