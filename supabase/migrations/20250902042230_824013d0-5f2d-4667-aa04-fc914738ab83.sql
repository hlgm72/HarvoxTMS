-- Create a helper function to get driver period calculation securely
CREATE OR REPLACE FUNCTION public.get_driver_period_calculation_secure(
  driver_user_id_param UUID,
  payment_period_id_param UUID,
  company_id_param UUID
) RETURNS UUID 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  calculation_id UUID;
BEGIN
  -- Direct query bypassing RLS since this function runs as SECURITY DEFINER
  SELECT dpc.id INTO calculation_id
  FROM driver_period_calculations dpc
  JOIN company_payment_periods cpp ON dpc.company_payment_period_id = cpp.id
  WHERE dpc.driver_user_id = driver_user_id_param
  AND cpp.id = payment_period_id_param
  AND cpp.company_id = company_id_param;
  
  RETURN calculation_id;
END;
$$;

-- Update the delete_load_with_validation function to use the secure helper
CREATE OR REPLACE FUNCTION public.delete_load_with_validation(load_id_param uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  current_user_id UUID;
  load_record RECORD;
  target_company_id UUID;
  result_data JSONB;
  driver_calculation_id UUID;
  factoring_expense_type_id UUID;
  dispatching_expense_type_id UUID;
  leasing_expense_type_id UUID;
  factoring_amount NUMERIC := 0;
  dispatching_amount NUMERIC := 0;
  leasing_amount NUMERIC := 0;
BEGIN
  -- Get current authenticated user
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Error en eliminación ACID de carga: Usuario no autenticado';
  END IF;

  -- Get load record and verify it exists
  SELECT * INTO load_record
  FROM loads 
  WHERE id = load_id_param;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Error en eliminación ACID de carga: Carga no encontrada';
  END IF;

  -- Get company_id through payment_period or driver_user_id or client_id
  IF load_record.payment_period_id IS NOT NULL THEN
    -- Get company through payment period
    SELECT cpp.company_id INTO target_company_id
    FROM company_payment_periods cpp
    WHERE cpp.id = load_record.payment_period_id;
  ELSIF load_record.driver_user_id IS NOT NULL THEN
    -- Get company through driver's company roles
    SELECT DISTINCT ucr.company_id INTO target_company_id
    FROM user_company_roles ucr
    WHERE ucr.user_id = load_record.driver_user_id
    AND ucr.is_active = true
    LIMIT 1;
  ELSIF load_record.client_id IS NOT NULL THEN
    -- Get company through client
    SELECT cc.company_id INTO target_company_id
    FROM company_clients cc
    WHERE cc.id = load_record.client_id;
  ELSE
    -- Try to get company through the user who created the load
    SELECT DISTINCT ucr.company_id INTO target_company_id
    FROM user_company_roles ucr
    WHERE ucr.user_id = COALESCE(load_record.created_by, current_user_id)
    AND ucr.is_active = true
    LIMIT 1;
  END IF;

  IF target_company_id IS NULL THEN
    RAISE EXCEPTION 'Error en eliminación ACID de carga: No se pudo identificar la empresa de la carga';
  END IF;

  -- Verify user has permissions to delete this load
  IF NOT EXISTS (
    SELECT 1 FROM user_company_roles ucr
    WHERE ucr.user_id = current_user_id
    AND ucr.company_id = target_company_id
    AND ucr.role IN ('company_owner', 'operations_manager', 'superadmin')
    AND ucr.is_active = true
  ) THEN
    RAISE EXCEPTION 'Error en eliminación ACID de carga: Sin permisos para eliminar esta carga';
  END IF;

  -- Start ACID transaction for deletion
  BEGIN
    -- STEP 1: Remove percentage deductions if driver is assigned and has percentages
    IF load_record.driver_user_id IS NOT NULL AND load_record.payment_period_id IS NOT NULL THEN
      -- Get driver period calculation ID using secure helper function
      driver_calculation_id := get_driver_period_calculation_secure(
        load_record.driver_user_id,
        load_record.payment_period_id,
        target_company_id
      );

      IF driver_calculation_id IS NOT NULL THEN
        -- Get expense type IDs for percentage deductions
        SELECT id INTO factoring_expense_type_id 
        FROM expense_types 
        WHERE LOWER(name) LIKE '%factoring%' AND category = 'percentage_deduction' 
        LIMIT 1;
        
        SELECT id INTO dispatching_expense_type_id 
        FROM expense_types 
        WHERE LOWER(name) LIKE '%dispatch%' AND category = 'percentage_deduction' 
        LIMIT 1;
        
        SELECT id INTO leasing_expense_type_id 
        FROM expense_types 
        WHERE LOWER(name) LIKE '%leas%' AND category = 'percentage_deduction' 
        LIMIT 1;

        -- Calculate deduction amounts that need to be removed
        IF load_record.factoring_percentage > 0 THEN
          factoring_amount := (load_record.total_amount * load_record.factoring_percentage / 100);
        END IF;
        
        IF load_record.dispatching_percentage > 0 THEN
          dispatching_amount := (load_record.total_amount * load_record.dispatching_percentage / 100);
        END IF;
        
        IF load_record.leasing_percentage > 0 THEN
          leasing_amount := (load_record.total_amount * load_record.leasing_percentage / 100);
        END IF;

        -- Remove the specific expense instances created for this load
        DELETE FROM expense_instances 
        WHERE payment_period_id = driver_calculation_id 
        AND expense_type_id IN (
          SELECT id FROM expense_types 
          WHERE category = 'percentage_deduction'
        )
        AND description LIKE '%Load ' || load_record.load_number || '%';
      END IF;
    END IF;

    -- STEP 2: Delete related load stops
    DELETE FROM load_stops WHERE load_id = load_id_param;

    -- STEP 3: Delete the load itself
    DELETE FROM loads WHERE id = load_id_param;

    -- STEP 4: Return success result
    result_data := jsonb_build_object(
      'success', true,
      'message', 'Carga eliminada exitosamente con verificación ACID',
      'load_id', load_id_param,
      'company_id', target_company_id,
      'deductions_removed', jsonb_build_object(
        'factoring_amount', factoring_amount,
        'dispatching_amount', dispatching_amount,
        'leasing_amount', leasing_amount
      ),
      'deleted_by', current_user_id,
      'deleted_at', now()
    );

  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Error en eliminación ACID de carga: %', SQLERRM;
  END;

  RETURN result_data;

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Error en eliminación ACID de carga: %', SQLERRM;
END;
$$;