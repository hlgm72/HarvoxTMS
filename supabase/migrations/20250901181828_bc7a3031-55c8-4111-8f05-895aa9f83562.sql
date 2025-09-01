-- Fix the delete_other_income_with_validation function
-- The issue is with incorrect JOIN logic
CREATE OR REPLACE FUNCTION public.delete_other_income_with_validation(
  income_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  income_record RECORD;
  driver_calculation_id UUID;
  current_user_id UUID;
BEGIN
  -- Get current authenticated user
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  -- ================================
  -- 1. VALIDATE ACCESS AND GET DATA
  -- ================================
  SELECT oi.*
  INTO income_record
  FROM other_income oi
  JOIN company_payment_periods cpp ON oi.payment_period_id = cpp.id
  JOIN user_company_roles ucr ON cpp.company_id = ucr.company_id
  WHERE oi.id = income_id
  AND ucr.user_id = current_user_id
  AND ucr.is_active = true;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ingreso no encontrado o sin permisos para eliminar';
  END IF;

  -- Get the driver calculation ID for recalculation
  SELECT dpc.id INTO driver_calculation_id
  FROM driver_period_calculations dpc
  WHERE dpc.company_payment_period_id = income_record.payment_period_id
  AND dpc.driver_user_id = income_record.user_id
  LIMIT 1;

  -- ================================
  -- 2. DELETE OTHER INCOME RECORD
  -- ================================
  DELETE FROM other_income WHERE id = income_id;

  -- ================================
  -- 3. TRIGGER AUTOMATIC RECALCULATION
  -- ================================
  IF driver_calculation_id IS NOT NULL THEN
    PERFORM calculate_driver_payment_period_v2(driver_calculation_id);
  END IF;

  -- Return success result
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Otro ingreso eliminado exitosamente con garantías ACID',
    'deleted_income_id', income_id,
    'deleted_amount', income_record.amount,
    'period_recalculated', driver_calculation_id,
    'deleted_by', current_user_id,
    'deleted_at', now()
  );

EXCEPTION WHEN OTHERS THEN
  -- Automatic rollback on any error
  RAISE EXCEPTION 'Error eliminando otro ingreso ACID: %', SQLERRM;
END;
$$;