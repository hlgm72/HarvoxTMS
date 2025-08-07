-- ===============================================
-- ACID FUNCTION FOR IMPROVED DRIVER PAYMENT
-- ===============================================

-- Function: Mark Driver as Paid with enhanced ACID validation
CREATE OR REPLACE FUNCTION public.mark_driver_as_paid_with_validation(
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
  current_user_id UUID;
  calculation_record RECORD;
  period_record RECORD;
BEGIN
  -- Get current authenticated user
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  -- ================================
  -- 1. VALIDATE CALCULATION EXISTS AND ACCESS
  -- ================================
  
  SELECT dpc.*, cpp.company_id, cpp.is_locked, cpp.status as period_status
  INTO calculation_record
  FROM driver_period_calculations dpc
  JOIN company_payment_periods cpp ON dpc.company_payment_period_id = cpp.id
  JOIN user_company_roles ucr ON cpp.company_id = ucr.company_id
  WHERE dpc.id = calculation_id
  AND ucr.user_id = current_user_id
  AND ucr.role IN ('company_owner', 'operations_manager', 'superadmin')
  AND ucr.is_active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cálculo no encontrado o sin permisos para marcarlo como pagado';
  END IF;

  -- ================================
  -- 2. VALIDATE BUSINESS RULES
  -- ================================
  
  -- Check if period is locked
  IF calculation_record.is_locked THEN
    RAISE EXCEPTION 'No se pueden procesar pagos en un período bloqueado';
  END IF;

  -- Check if already paid
  IF calculation_record.payment_status = 'paid' THEN
    RAISE EXCEPTION 'El conductor ya está marcado como pagado';
  END IF;

  -- Validate payment status is ready for payment
  IF calculation_record.payment_status NOT IN ('calculated', 'approved') THEN
    RAISE EXCEPTION 'El estado del cálculo no permite el pago. Estado actual: %', calculation_record.payment_status;
  END IF;

  -- ================================
  -- 3. MARK AS PAID WITH ACID GUARANTEES
  -- ================================
  
  UPDATE driver_period_calculations
  SET 
    payment_status = 'paid',
    paid_at = now(),
    paid_by = current_user_id,
    payment_method = payment_method_used,
    payment_reference = payment_ref,
    payment_notes = notes,
    updated_at = now()
  WHERE id = calculation_id;

  -- Verify the update was successful
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Error actualizando el estado de pago';
  END IF;

  -- Return success result
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Conductor marcado como pagado exitosamente',
    'calculation_id', calculation_id,
    'driver_user_id', calculation_record.driver_user_id,
    'net_payment', calculation_record.net_payment,
    'payment_method', payment_method_used,
    'payment_reference', payment_ref,
    'paid_by', current_user_id,
    'paid_at', now()
  );

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Error en pago ACID de conductor: %', SQLERRM;
END;
$$;