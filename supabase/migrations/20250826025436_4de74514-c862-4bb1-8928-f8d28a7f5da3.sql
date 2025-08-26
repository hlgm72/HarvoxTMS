-- Final migration: Update document creation function and add any remaining functions

-- 9. Update create_or_update_document_with_validation function
CREATE OR REPLACE FUNCTION public.create_or_update_document_with_validation(document_data jsonb, document_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  current_user_id UUID;
  target_company_id UUID;
  result_document RECORD;
  operation_type TEXT;
BEGIN
  -- Get current authenticated user
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'ERROR_USER_NOT_AUTHENTICATED';
  END IF;

  -- Extract company_id from document_data
  target_company_id := (document_data->>'company_id')::UUID;
  IF target_company_id IS NULL THEN
    RAISE EXCEPTION 'ERROR_COMPANY_ID_REQUIRED';
  END IF;

  -- Determine operation type
  operation_type := CASE WHEN document_id IS NOT NULL THEN 'UPDATE' ELSE 'CREATE' END;

  -- ================================
  -- 1. VALIDATE PERMISSIONS
  -- ================================
  IF NOT EXISTS (
    SELECT 1 FROM user_company_roles
    WHERE user_id = current_user_id
    AND company_id = target_company_id
    AND role IN ('company_owner', 'operations_manager', 'superadmin')
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'ERROR_NO_PERMISSIONS_MANAGE_DOCUMENTS';
  END IF;

  -- For UPDATE operations, validate document exists and user has access
  IF operation_type = 'UPDATE' THEN
    IF NOT EXISTS (
      SELECT 1 FROM company_documents cd
      JOIN user_company_roles ucr ON cd.company_id = ucr.company_id
      WHERE cd.id = document_id
      AND ucr.user_id = current_user_id
      AND ucr.is_active = true
    ) THEN
      RAISE EXCEPTION 'ERROR_DOCUMENT_NOT_FOUND';
    END IF;
  END IF;

  -- ================================
  -- 2. VALIDATE BUSINESS RULES
  -- ================================
  
  -- Validate required fields
  IF NULLIF(document_data->>'document_name', '') IS NULL THEN
    RAISE EXCEPTION 'ERROR_NAME_REQUIRED';
  END IF;

  IF NULLIF(document_data->>'document_type', '') IS NULL THEN
    RAISE EXCEPTION 'ERROR_FIELD_REQUIRED:document_type';
  END IF;

  -- ================================
  -- 3. CREATE OR UPDATE DOCUMENT
  -- ================================
  
  IF operation_type = 'CREATE' THEN
    INSERT INTO company_documents (
      company_id,
      document_name,
      document_type,
      file_path,
      file_size,
      mime_type,
      uploaded_by,
      notes
    ) VALUES (
      target_company_id,
      document_data->>'document_name',
      document_data->>'document_type',
      NULLIF(document_data->>'file_path', ''),
      NULLIF((document_data->>'file_size'), '')::BIGINT,
      NULLIF(document_data->>'mime_type', ''),
      current_user_id,
      NULLIF(document_data->>'notes', '')
    ) RETURNING * INTO result_document;
  ELSE
    UPDATE company_documents SET
      document_name = document_data->>'document_name',
      document_type = document_data->>'document_type',
      file_path = COALESCE(NULLIF(document_data->>'file_path', ''), file_path),
      file_size = COALESCE(NULLIF((document_data->>'file_size'), '')::BIGINT, file_size),
      mime_type = COALESCE(NULLIF(document_data->>'mime_type', ''), mime_type),
      notes = NULLIF(document_data->>'notes', ''),
      updated_at = now()
    WHERE id = document_id
    RETURNING * INTO result_document;
  END IF;

  -- Return success result
  RETURN jsonb_build_object(
    'success', true,
    'operation', operation_type,
    'message', CASE 
      WHEN operation_type = 'CREATE' THEN 'Documento creado exitosamente'
      ELSE 'Documento actualizado exitosamente'
    END,
    'document', row_to_json(result_document),
    'processed_by', current_user_id,
    'processed_at', now()
  );

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'ERROR_OPERATION_FAILED: %', SQLERRM;
END;
$function$;

-- 10. Add some missing error codes translations to can_close_payment_period function
CREATE OR REPLACE FUNCTION public.can_close_payment_period(period_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
      WHEN pending_drivers > 0 THEN 'ERROR_CANNOT_CLOSE_PERIOD:reason:Hay conductores pendientes de pago'
      WHEN failed_drivers > 0 THEN 'ERROR_CANNOT_CLOSE_PERIOD:reason:Hay pagos fallidos que requieren atención'
      WHEN total_drivers = 0 THEN 'ERROR_CANNOT_CLOSE_PERIOD:reason:No hay conductores en este período'
      ELSE 'Todos los conductores han sido pagados'
    END
  );
  
  RETURN result;
END;
$function$;