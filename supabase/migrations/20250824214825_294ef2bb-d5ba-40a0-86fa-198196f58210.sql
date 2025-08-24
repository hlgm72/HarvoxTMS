-- Update the can_user_be_permanently_deleted function to include is_orphaned_invitation flag
CREATE OR REPLACE FUNCTION public.can_user_be_permanently_deleted(user_id_param uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    current_user_id UUID;
    target_company_id UUID;
    user_email TEXT;
    is_real_user BOOLEAN := false;
    is_orphaned_invitation BOOLEAN := false;
    can_delete BOOLEAN := false;
    blocking_factors TEXT[] := '{}';
    summary JSONB := '{}';
    
    -- Data counts
    fuel_expenses_count INTEGER := 0;
    loads_count INTEGER := 0;
    owned_companies_count INTEGER := 0;
    documents_count INTEGER := 0;
    payment_calculations_count INTEGER := 0;
    equipment_assignments_count INTEGER := 0;
    active_roles_count INTEGER := 0;
    driver_profiles_count INTEGER := 0;
    owner_operator_count INTEGER := 0;
BEGIN
    -- Get current authenticated user and their company
    current_user_id := auth.uid();
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'Usuario no autenticado';
    END IF;

    -- Get user's company
    SELECT company_id INTO target_company_id
    FROM user_company_roles
    WHERE user_id = current_user_id 
    AND is_active = true 
    AND role IN ('company_owner', 'superadmin')
    LIMIT 1;

    IF target_company_id IS NULL THEN
        RAISE EXCEPTION 'Sin permisos para eliminar usuarios';
    END IF;

    -- First, check if this is a real user in auth.users
    SELECT EXISTS (
        SELECT 1 FROM auth.users WHERE id = user_id_param
    ) INTO is_real_user;

    -- If not a real user, check if it's an invitation
    IF NOT is_real_user THEN
        SELECT email INTO user_email
        FROM user_invitations 
        WHERE id = user_id_param 
        AND company_id = target_company_id
        AND is_active = true;
        
        IF user_email IS NOT NULL THEN
            -- This is an orphaned invitation
            is_orphaned_invitation := true;
            can_delete := true;
            
            RETURN jsonb_build_object(
                'can_delete', true,
                'user_email', user_email,
                'is_orphaned_invitation', true,
                'message', 'Invitación puede ser eliminada (no hay usuario asociado)',
                'summary', jsonb_build_object(),
                'blocking_factors', ARRAY[]::TEXT[]
            );
        ELSE
            -- User/invitation not found
            RAISE EXCEPTION 'Usuario o invitación no encontrado';
        END IF;
    END IF;

    -- For real users, get email and perform full analysis
    SELECT au.email INTO user_email
    FROM auth.users au
    WHERE au.id = user_id_param;

    IF user_email IS NULL THEN
        RAISE EXCEPTION 'Usuario no encontrado en el sistema de autenticación';
    END IF;

    -- Count related data that would block deletion
    -- 1. Fuel expenses
    SELECT COUNT(*) INTO fuel_expenses_count
    FROM fuel_expenses fe
    WHERE fe.driver_user_id = user_id_param;

    -- 2. Loads as driver
    SELECT COUNT(*) INTO loads_count
    FROM loads l
    WHERE l.driver_user_id = user_id_param;

    -- 3. Owned companies (company owner roles)
    SELECT COUNT(*) INTO owned_companies_count
    FROM user_company_roles ucr
    WHERE ucr.user_id = user_id_param 
    AND ucr.role = 'company_owner'
    AND ucr.is_active = true;

    -- 4. Uploaded documents
    SELECT COUNT(*) INTO documents_count
    FROM company_documents cd
    WHERE cd.uploaded_by = user_id_param;

    -- 5. Payment calculations with "paid" status
    SELECT COUNT(*) INTO payment_calculations_count
    FROM driver_period_calculations dpc
    WHERE dpc.driver_user_id = user_id_param
    AND dpc.payment_status = 'paid';

    -- 6. Equipment assignments
    SELECT COUNT(*) INTO equipment_assignments_count
    FROM equipment_assignments ea
    WHERE ea.driver_user_id = user_id_param;

    -- 7. Active roles in any company
    SELECT COUNT(*) INTO active_roles_count
    FROM user_company_roles ucr
    WHERE ucr.user_id = user_id_param 
    AND ucr.is_active = true;

    -- 8. Driver profiles
    SELECT COUNT(*) INTO driver_profiles_count
    FROM driver_profiles dp
    WHERE dp.user_id = user_id_param;

    -- 9. Owner operator records
    SELECT COUNT(*) INTO owner_operator_count
    FROM owner_operators oo
    WHERE oo.user_id = user_id_param;

    -- Build summary
    summary := jsonb_build_object(
        'fuel_expenses', fuel_expenses_count,
        'loads_as_driver', loads_count,
        'owned_companies', owned_companies_count,
        'uploaded_documents', documents_count,
        'payment_calculations', payment_calculations_count,
        'equipment_assignments', equipment_assignments_count,
        'active_roles', active_roles_count,
        'driver_profiles', driver_profiles_count,
        'owner_operator_records', owner_operator_count
    );

    -- Determine blocking factors
    IF fuel_expenses_count > 0 THEN
        blocking_factors := array_append(blocking_factors, format('Tiene %s gastos de combustible registrados', fuel_expenses_count));
    END IF;

    IF loads_count > 0 THEN
        blocking_factors := array_append(blocking_factors, format('Tiene %s cargas asignadas como conductor', loads_count));
    END IF;

    IF owned_companies_count > 0 THEN
        blocking_factors := array_append(blocking_factors, format('Es propietario de %s empresa(s)', owned_companies_count));
    END IF;

    IF documents_count > 0 THEN
        blocking_factors := array_append(blocking_factors, format('Ha subido %s documento(s) al sistema', documents_count));
    END IF;

    IF payment_calculations_count > 0 THEN
        blocking_factors := array_append(blocking_factors, format('Tiene %s pago(s) procesado(s)', payment_calculations_count));
    END IF;

    -- Determine if user can be deleted
    can_delete := (
        fuel_expenses_count = 0 AND
        loads_count = 0 AND
        owned_companies_count = 0 AND
        documents_count = 0 AND
        payment_calculations_count = 0
    );

    RETURN jsonb_build_object(
        'can_delete', can_delete,
        'user_email', user_email,
        'is_orphaned_invitation', false,
        'summary', summary,
        'blocking_factors', blocking_factors,
        'message', CASE 
            WHEN can_delete THEN 'Usuario puede ser eliminado'
            ELSE 'Usuario no puede ser eliminado debido a datos relacionados'
        END
    );

EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Error analizando eliminación de usuario: %', SQLERRM;
END;
$$;