-- Agregar campos de estado de pago a driver_period_calculations
ALTER TABLE public.driver_period_calculations 
ADD COLUMN payment_status TEXT DEFAULT 'calculated' CHECK (payment_status IN ('calculated', 'approved', 'paid', 'failed')),
ADD COLUMN paid_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN paid_by UUID REFERENCES auth.users(id),
ADD COLUMN payment_method TEXT,
ADD COLUMN payment_reference TEXT,
ADD COLUMN payment_notes TEXT;

-- Crear función para verificar si un período puede cerrarse
CREATE OR REPLACE FUNCTION public.can_close_payment_period(period_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  total_drivers INTEGER;
  paid_drivers INTEGER;
  pending_drivers INTEGER;
  failed_drivers INTEGER;
  result JSONB;
BEGIN
  -- Contar estados de conductores en el período
  SELECT 
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE payment_status = 'paid') as paid,
    COUNT(*) FILTER (WHERE payment_status IN ('calculated', 'approved')) as pending,
    COUNT(*) FILTER (WHERE payment_status = 'failed') as failed
  INTO total_drivers, paid_drivers, pending_drivers, failed_drivers
  FROM driver_period_calculations
  WHERE company_payment_period_id = period_id;
  
  -- Determinar si se puede cerrar
  result := jsonb_build_object(
    'can_close', (pending_drivers = 0 AND failed_drivers = 0 AND total_drivers > 0),
    'total_drivers', total_drivers,
    'paid_drivers', paid_drivers,
    'pending_drivers', pending_drivers,
    'failed_drivers', failed_drivers,
    'closure_requirements', CASE 
      WHEN pending_drivers > 0 THEN 'Hay conductores pendientes de pago'
      WHEN failed_drivers > 0 THEN 'Hay pagos fallidos que requieren atención'
      WHEN total_drivers = 0 THEN 'No hay conductores en este período'
      ELSE 'Todos los conductores han sido pagados'
    END
  );
  
  RETURN result;
END;
$$;

-- Crear función para marcar conductor como pagado
CREATE OR REPLACE FUNCTION public.mark_driver_as_paid(
  calculation_id UUID,
  payment_method_used TEXT DEFAULT NULL,
  payment_ref TEXT DEFAULT NULL,
  notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  updated_record RECORD;
BEGIN
  -- Verificar que el cálculo existe y no está ya pagado
  SELECT * INTO updated_record
  FROM driver_period_calculations
  WHERE id = calculation_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Cálculo no encontrado');
  END IF;
  
  IF updated_record.payment_status = 'paid' THEN
    RETURN jsonb_build_object('success', false, 'message', 'El conductor ya está marcado como pagado');
  END IF;
  
  -- Marcar como pagado
  UPDATE driver_period_calculations
  SET 
    payment_status = 'paid',
    paid_at = now(),
    paid_by = auth.uid(),
    payment_method = payment_method_used,
    payment_reference = payment_ref,
    payment_notes = notes,
    updated_at = now()
  WHERE id = calculation_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Conductor marcado como pagado exitosamente',
    'calculation_id', calculation_id,
    'paid_at', now()
  );
END;
$$;

-- Crear función para cerrar período cuando todos están pagados
CREATE OR REPLACE FUNCTION public.close_payment_period_when_complete(period_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  can_close_result JSONB;
  period_record RECORD;
BEGIN
  -- Verificar si se puede cerrar
  SELECT can_close_payment_period(period_id) INTO can_close_result;
  
  IF NOT (can_close_result->>'can_close')::BOOLEAN THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', can_close_result->>'closure_requirements',
      'details', can_close_result
    );
  END IF;
  
  -- Verificar que el período existe y no está ya cerrado
  SELECT * INTO period_record
  FROM company_payment_periods
  WHERE id = period_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Período no encontrado');
  END IF;
  
  IF period_record.is_locked THEN
    RETURN jsonb_build_object('success', false, 'message', 'El período ya está cerrado');
  END IF;
  
  -- Cerrar el período
  UPDATE company_payment_periods
  SET 
    status = 'closed',
    is_locked = true,
    locked_at = now(),
    locked_by = auth.uid(),
    updated_at = now()
  WHERE id = period_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Período cerrado exitosamente',
    'period_id', period_id,
    'drivers_paid', (can_close_result->>'paid_drivers')::INTEGER,
    'closed_at', now()
  );
END;
$$;