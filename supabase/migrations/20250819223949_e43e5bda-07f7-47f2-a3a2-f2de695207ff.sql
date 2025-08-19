-- Función para eliminar transacciones de combustible importadas recientemente con fechas incorrectas
CREATE OR REPLACE FUNCTION delete_recent_fuel_expenses_with_timezone_issues()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_user_id UUID;
  deleted_count INTEGER := 0;
  target_company_id UUID;
  transaction_ids UUID[];
BEGIN
  -- Get current authenticated user
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  -- Get user's company
  SELECT company_id INTO target_company_id
  FROM user_company_roles
  WHERE user_id = current_user_id
  AND is_active = true
  LIMIT 1;

  IF target_company_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no pertenece a ninguna empresa';
  END IF;

  -- Validate user has admin permissions
  IF NOT EXISTS (
    SELECT 1 FROM user_company_roles
    WHERE user_id = current_user_id
    AND company_id = target_company_id
    AND role IN ('company_owner', 'operations_manager', 'superadmin')
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Sin permisos para eliminar gastos de combustible';
  END IF;

  -- Get IDs of fuel expenses imported in the last 2 hours from company drivers
  SELECT ARRAY_AGG(fe.id) INTO transaction_ids
  FROM fuel_expenses fe
  JOIN driver_period_calculations dpc ON fe.payment_period_id = dpc.id
  JOIN company_payment_periods cpp ON dpc.company_payment_period_id = cpp.id
  WHERE cpp.company_id = target_company_id
  AND fe.created_at >= NOW() - INTERVAL '2 hours'
  AND fe.status = 'pending';

  -- Delete the transactions
  IF transaction_ids IS NOT NULL AND array_length(transaction_ids, 1) > 0 THEN
    DELETE FROM fuel_expenses 
    WHERE id = ANY(transaction_ids);
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
  END IF;

  -- Return result
  RETURN jsonb_build_object(
    'success', true,
    'deleted_count', deleted_count,
    'deleted_transaction_ids', transaction_ids,
    'message', format('Se eliminaron %s transacciones de combustible con fechas incorrectas', deleted_count),
    'deleted_by', current_user_id,
    'deleted_at', now()
  );

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Error eliminando transacciones: %', SQLERRM;
END;
$$;