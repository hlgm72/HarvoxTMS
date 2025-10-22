-- ===============================================
-- FIX: Al marcar como pagado, incluir instancias 'cancelled'
-- ===============================================
-- 
-- CONTEXTO: Cuando se cancela una instancia automática y el payroll
-- queda vacío (net_pay=0), ya NO se elimina el payroll.
-- En su lugar, se mantiene el payroll para poder marcarlo manualmente
-- como PAGADO, y al hacerlo, las instancias 'cancelled' deben pasar
-- a 'applied' para hacer todo inmutable.

DROP FUNCTION IF EXISTS public.mark_driver_as_paid_with_validation(UUID, TEXT, TEXT, TEXT);

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
  expense_instances_updated INTEGER;
BEGIN
  -- Get current authenticated user
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  -- ================================
  -- 1. VALIDATE CALCULATION EXISTS AND ACCESS
  -- ================================
  
  SELECT up.*, cpp.company_id, cpp.id as period_id
  INTO calculation_record
  FROM user_payrolls up
  JOIN company_payment_periods cpp ON up.company_payment_period_id = cpp.id
  JOIN user_company_roles ucr ON cpp.company_id = ucr.company_id
  WHERE up.id = calculation_id
  AND ucr.user_id = current_user_id
  AND ucr.role IN ('company_owner', 'operations_manager', 'superadmin')
  AND ucr.is_active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cálculo no encontrado o sin permisos para marcarlo como pagado';
  END IF;

  -- ================================
  -- 2. VALIDATE BUSINESS RULES
  -- ================================
  
  -- Check if already paid
  IF calculation_record.payment_status = 'paid' THEN
    RAISE EXCEPTION 'El conductor ya está marcado como pagado';
  END IF;

  -- Validate payment status is ready for payment
  IF calculation_record.payment_status NOT IN ('calculated', 'approved', 'pending') THEN
    RAISE EXCEPTION 'El estado del cálculo no permite el pago. Estado actual: %', calculation_record.payment_status;
  END IF;

  -- ================================
  -- 3. MARK AS PAID WITH ACID GUARANTEES
  -- ================================
  
  -- Update payroll status
  UPDATE user_payrolls
  SET 
    payment_status = 'paid',
    paid_at = now(),
    paid_by = current_user_id,
    payment_method = payment_method_used,
    payment_reference = payment_ref,
    payment_notes = notes,
    updated_at = now()
  WHERE id = calculation_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Error actualizando el estado de pago';
  END IF;

  -- ✅ NUEVO: Actualizar instancias tanto 'planned' como 'cancelled' a 'applied'
  -- Esto hace las instancias inmutables cuando se paga un período
  UPDATE expense_instances
  SET 
    status = 'applied',
    applied_at = now()
  WHERE payment_period_id = calculation_record.period_id
  AND user_id = calculation_record.user_id
  AND status IN ('planned', 'cancelled');

  GET DIAGNOSTICS expense_instances_updated = ROW_COUNT;

  -- ================================
  -- 4. RETURN SUCCESS RESULT
  -- ================================
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Conductor marcado como pagado exitosamente',
    'calculation_id', calculation_id,
    'user_id', calculation_record.user_id,
    'net_payment', calculation_record.net_payment,
    'payment_method', payment_method_used,
    'payment_reference', payment_ref,
    'paid_by', current_user_id,
    'paid_at', now(),
    'expense_instances_updated', expense_instances_updated
  );

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Error en pago ACID de conductor: %', SQLERRM;
END;
$$;