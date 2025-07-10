-- Agregar campos para controlar el estado final de períodos de pago
ALTER TABLE public.payment_periods 
ADD COLUMN is_locked BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN locked_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN locked_by UUID,
ADD COLUMN payment_method TEXT, -- 'check', 'direct_deposit', 'cash', 'transfer'
ADD COLUMN payment_reference TEXT; -- Número de cheque, ID de transferencia, etc.

-- Actualizar los posibles estados
COMMENT ON COLUMN public.payment_periods.status IS 'draft, calculated, approved, paid, locked';

-- Función para bloquear un período y toda su información relacionada
CREATE OR REPLACE FUNCTION public.lock_payment_period(
  period_id UUID,
  payment_method_used TEXT DEFAULT NULL,
  payment_ref TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  period_record RECORD;
  related_count INTEGER;
BEGIN
  -- Verificar que el período existe y está en estado apropiado
  SELECT * INTO period_record 
  FROM public.payment_periods 
  WHERE id = period_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Período no encontrado');
  END IF;
  
  IF period_record.is_locked THEN
    RETURN jsonb_build_object('success', false, 'message', 'El período ya está bloqueado');
  END IF;
  
  IF period_record.status NOT IN ('approved', 'paid') THEN
    RETURN jsonb_build_object('success', false, 'message', 'El período debe estar aprobado o pagado para bloquear');
  END IF;
  
  -- Contar elementos relacionados para el log
  SELECT 
    (SELECT COUNT(*) FROM public.fuel_expenses WHERE payment_period_id = period_id) +
    (SELECT COUNT(*) FROM public.expense_instances WHERE payment_period_id = period_id) +
    (SELECT COUNT(*) FROM public.other_income WHERE payment_period_id = period_id)
  INTO related_count;
  
  -- Bloquear el período
  UPDATE public.payment_periods 
  SET 
    is_locked = true,
    locked_at = now(),
    locked_by = auth.uid(),
    status = 'locked',
    payment_method = payment_method_used,
    payment_reference = payment_ref
  WHERE id = period_id;
  
  RETURN jsonb_build_object(
    'success', true, 
    'message', 'Período bloqueado exitosamente',
    'period_id', period_id,
    'locked_records', related_count
  );
END;
$$;

-- Función para verificar si un período está bloqueado
CREATE OR REPLACE FUNCTION public.is_period_locked(period_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT COALESCE(is_locked, false) 
  FROM public.payment_periods 
  WHERE id = period_id;
$$;

-- Políticas RLS actualizadas para prevenir modificaciones en períodos bloqueados

-- FUEL EXPENSES: No permitir updates/deletes si el período está bloqueado
DROP POLICY IF EXISTS "Company members can manage fuel expenses" ON public.fuel_expenses;
CREATE POLICY "Company members can manage fuel expenses" ON public.fuel_expenses FOR ALL USING (
  driver_user_id IN (
    SELECT ucr.user_id FROM public.user_company_roles ucr 
    WHERE ucr.company_id IN (
      SELECT company_id FROM public.user_company_roles 
      WHERE user_id = auth.uid() AND is_active = true
    ) AND ucr.is_active = true
  )
  AND NOT public.is_period_locked(payment_period_id) -- Prevenir cambios si está bloqueado
);

-- EXPENSE INSTANCES: No permitir updates/deletes si el período está bloqueado  
DROP POLICY IF EXISTS "Company members can manage expense instances" ON public.expense_instances;
CREATE POLICY "Company members can manage expense instances" ON public.expense_instances FOR ALL USING (
  payment_period_id IN (
    SELECT pp.id FROM payment_periods pp
    JOIN user_company_roles ucr ON pp.driver_user_id = ucr.user_id
    WHERE ucr.company_id IN (
      SELECT company_id FROM user_company_roles 
      WHERE user_id = auth.uid() AND is_active = true
    ) AND ucr.is_active = true
  )
  AND NOT public.is_period_locked(payment_period_id) -- Prevenir cambios si está bloqueado
);

-- OTHER INCOME: No permitir updates/deletes si el período está bloqueado
DROP POLICY IF EXISTS "Company members can manage other income" ON public.other_income;
CREATE POLICY "Company members can manage other income" ON public.other_income FOR ALL USING (
  driver_user_id IN (
    SELECT ucr.user_id FROM public.user_company_roles ucr 
    WHERE ucr.company_id IN (
      SELECT company_id FROM public.user_company_roles 
      WHERE user_id = auth.uid() AND is_active = true
    ) AND ucr.is_active = true
  )
  AND NOT public.is_period_locked(payment_period_id) -- Prevenir cambios si está bloqueado
);