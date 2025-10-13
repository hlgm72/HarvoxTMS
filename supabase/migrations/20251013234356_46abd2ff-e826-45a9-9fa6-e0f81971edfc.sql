
-- 🚨 CORRECCIÓN CRÍTICA: Actualizar mark_driver_as_paid para usar user_payrolls
-- La función estaba usando la tabla obsoleta driver_period_calculations

CREATE OR REPLACE FUNCTION public.mark_driver_as_paid(
  calculation_id UUID,
  payment_method_used TEXT DEFAULT NULL,
  payment_ref TEXT DEFAULT NULL,
  notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  updated_record RECORD;
BEGIN
  -- Verificar que el cálculo existe y no está ya pagado
  SELECT * INTO updated_record
  FROM user_payrolls
  WHERE id = calculation_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'ERROR_CALCULATION_NOT_FOUND');
  END IF;
  
  IF updated_record.payment_status = 'paid' THEN
    RETURN jsonb_build_object('success', false, 'message', 'ERROR_ALREADY_PAID');
  END IF;
  
  -- Marcar como pagado
  UPDATE user_payrolls
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
