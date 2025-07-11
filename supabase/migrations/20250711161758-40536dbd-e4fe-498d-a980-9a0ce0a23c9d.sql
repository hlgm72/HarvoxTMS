-- Fix remaining functions with mutable search_path
-- Complete the security fixes for the remaining functions

CREATE OR REPLACE FUNCTION public.can_delete_test_company(company_id_param uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  company_record RECORD;
  load_count INTEGER;
  driver_count INTEGER;
  payment_period_count INTEGER;
  fuel_expense_count INTEGER;
BEGIN
  -- Get company details
  SELECT * INTO company_record FROM public.companies WHERE id = company_id_param;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('can_delete', false, 'reason', 'Company not found');
  END IF;
  
  -- Check if it's the SYSTEM_SUPERADMIN company
  IF company_record.name = 'SYSTEM_SUPERADMIN' THEN
    RETURN jsonb_build_object('can_delete', false, 'reason', 'Cannot delete system SuperAdmin company');
  END IF;
  
  -- Check if company is a test/demo/trial company
  IF company_record.plan_type NOT IN ('demo', 'trial', 'test') THEN
    RETURN jsonb_build_object('can_delete', false, 'reason', 'Only test, demo, or trial companies can be deleted');
  END IF;
  
  -- Check if company was created recently (within 30 days)
  IF company_record.created_at < (now() - interval '30 days') THEN
    RETURN jsonb_build_object('can_delete', false, 'reason', 'Company is older than 30 days');
  END IF;
  
  -- Count critical operational data
  SELECT COUNT(*) INTO load_count FROM public.loads l
  JOIN public.user_company_roles ucr ON l.driver_user_id = ucr.user_id
  WHERE ucr.company_id = company_id_param AND ucr.is_active = true;
  
  SELECT COUNT(*) INTO driver_count FROM public.user_company_roles
  WHERE company_id = company_id_param AND role = 'driver' AND is_active = true;
  
  SELECT COUNT(*) INTO payment_period_count FROM public.payment_periods pp
  JOIN public.user_company_roles ucr ON pp.driver_user_id = ucr.user_id
  WHERE ucr.company_id = company_id_param AND ucr.is_active = true;
  
  SELECT COUNT(*) INTO fuel_expense_count FROM public.fuel_expenses fe
  JOIN public.user_company_roles ucr ON fe.driver_user_id = ucr.user_id
  WHERE ucr.company_id = company_id_param AND ucr.is_active = true;
  
  -- Allow deletion if minimal operational data
  IF load_count > 5 OR payment_period_count > 3 OR fuel_expense_count > 10 THEN
    RETURN jsonb_build_object(
      'can_delete', false, 
      'reason', 'Company has too much operational data',
      'details', jsonb_build_object(
        'loads', load_count,
        'drivers', driver_count,
        'payment_periods', payment_period_count,
        'fuel_expenses', fuel_expense_count
      )
    );
  END IF;
  
  RETURN jsonb_build_object(
    'can_delete', true,
    'company_name', company_record.name,
    'plan_type', company_record.plan_type,
    'created_at', company_record.created_at,
    'data_summary', jsonb_build_object(
      'loads', load_count,
      'drivers', driver_count,
      'payment_periods', payment_period_count,
      'fuel_expenses', fuel_expense_count
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_test_company(company_id_param uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  validation_result JSONB;
  company_name TEXT;
  deleted_users UUID[];
  deletion_summary JSONB;
BEGIN
  -- First validate if company can be deleted
  SELECT public.can_delete_test_company(company_id_param) INTO validation_result;
  
  IF NOT (validation_result->>'can_delete')::BOOLEAN THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', validation_result->>'reason',
      'details', validation_result
    );
  END IF;
  
  -- Only SuperAdmin can delete companies
  IF NOT public.is_superadmin() THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Only SuperAdmin can delete companies'
    );
  END IF;
  
  company_name := validation_result->>'company_name';
  
  -- Get list of users to be affected
  SELECT ARRAY_AGG(user_id) INTO deleted_users
  FROM public.user_company_roles
  WHERE company_id = company_id_param;
  
  -- Delete in order (respecting foreign key constraints)
  -- 1. Payment reports
  DELETE FROM public.payment_reports pr
  WHERE pr.payment_period_id IN (
    SELECT pp.id FROM public.payment_periods pp
    JOIN public.user_company_roles ucr ON pp.driver_user_id = ucr.user_id
    WHERE ucr.company_id = company_id_param
  );
  
  -- 2. Expense instances
  DELETE FROM public.expense_instances ei
  WHERE ei.payment_period_id IN (
    SELECT pp.id FROM public.payment_periods pp
    JOIN public.user_company_roles ucr ON pp.driver_user_id = ucr.user_id
    WHERE ucr.company_id = company_id_param
  );
  
  -- 3. Pending expenses
  DELETE FROM public.pending_expenses pe
  WHERE pe.driver_user_id IN (
    SELECT ucr.user_id FROM public.user_company_roles ucr
    WHERE ucr.company_id = company_id_param
  );
  
  -- 4. Other income
  DELETE FROM public.other_income oi
  WHERE oi.driver_user_id IN (
    SELECT ucr.user_id FROM public.user_company_roles ucr
    WHERE ucr.company_id = company_id_param
  );
  
  -- 5. Fuel expenses
  DELETE FROM public.fuel_expenses fe
  WHERE fe.driver_user_id IN (
    SELECT ucr.user_id FROM public.user_company_roles ucr
    WHERE ucr.company_id = company_id_param
  );
  
  -- 6. Fuel limits
  DELETE FROM public.fuel_limits fl
  WHERE fl.driver_user_id IN (
    SELECT ucr.user_id FROM public.user_company_roles ucr
    WHERE ucr.company_id = company_id_param
  );
  
  -- 7. Payment periods
  DELETE FROM public.payment_periods pp
  WHERE pp.driver_user_id IN (
    SELECT ucr.user_id FROM public.user_company_roles ucr
    WHERE ucr.company_id = company_id_param
  );
  
  -- 8. Recurring expense templates
  DELETE FROM public.recurring_expense_templates ret
  WHERE ret.driver_user_id IN (
    SELECT ucr.user_id FROM public.user_company_roles ucr
    WHERE ucr.company_id = company_id_param
  );
  
  -- 9. Load documents and stops
  DELETE FROM public.load_documents ld
  WHERE ld.load_id IN (
    SELECT l.id FROM public.loads l
    JOIN public.user_company_roles ucr ON l.driver_user_id = ucr.user_id
    WHERE ucr.company_id = company_id_param
  );
  
  DELETE FROM public.load_stops ls
  WHERE ls.load_id IN (
    SELECT l.id FROM public.loads l
    JOIN public.user_company_roles ucr ON l.driver_user_id = ucr.user_id
    WHERE ucr.company_id = company_id_param
  );
  
  -- 10. Loads
  DELETE FROM public.loads l
  WHERE l.driver_user_id IN (
    SELECT ucr.user_id FROM public.user_company_roles ucr
    WHERE ucr.company_id = company_id_param
  );
  
  -- 11. Company-specific data
  DELETE FROM public.company_broker_dispatchers cbd
  WHERE cbd.broker_id IN (
    SELECT cb.id FROM public.company_brokers cb
    WHERE cb.company_id = company_id_param
  );
  
  DELETE FROM public.company_brokers WHERE company_id = company_id_param;
  DELETE FROM public.company_documents WHERE company_id = company_id_param;
  DELETE FROM public.payment_methods WHERE company_id = company_id_param;
  
  -- 12. User profiles and roles
  DELETE FROM public.owner_operators oo
  WHERE oo.user_id IN (
    SELECT ucr.user_id FROM public.user_company_roles ucr
    WHERE ucr.company_id = company_id_param
  );
  
  DELETE FROM public.company_drivers cd
  WHERE cd.user_id IN (
    SELECT ucr.user_id FROM public.user_company_roles ucr
    WHERE ucr.company_id = company_id_param
  );
  
  DELETE FROM public.driver_profiles dp
  WHERE dp.user_id IN (
    SELECT ucr.user_id FROM public.user_company_roles ucr
    WHERE ucr.company_id = company_id_param
  );
  
  DELETE FROM public.user_company_roles WHERE company_id = company_id_param;
  
  -- 13. Finally, delete the company
  DELETE FROM public.companies WHERE id = company_id_param;
  
  -- Create deletion summary
  SELECT jsonb_build_object(
    'company_id', company_id_param,
    'company_name', company_name,
    'deleted_users', deleted_users,
    'validation_details', validation_result,
    'deleted_at', now(),
    'deleted_by', auth.uid()
  ) INTO deletion_summary;
  
  -- Log the deletion
  INSERT INTO public.system_stats (stat_type, stat_value)
  VALUES ('company_deletion', deletion_summary);
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Test company deleted successfully',
    'company_name', company_name,
    'affected_users', array_length(deleted_users, 1),
    'deletion_summary', deletion_summary
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.create_first_superadmin(admin_email text, admin_password text, admin_first_name text DEFAULT 'Super'::text, admin_last_name text DEFAULT 'Admin'::text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  superadmin_count INTEGER;
  new_user_id UUID;
  result JSONB;
BEGIN
  -- Check if any Superadmin already exists
  SELECT COUNT(*) INTO superadmin_count
  FROM public.user_company_roles 
  WHERE role = 'superadmin' AND is_active = true;
  
  -- Only allow creation if no Superadmin exists
  IF superadmin_count > 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'A Superadmin already exists. Only one Superadmin can be created.'
    );
  END IF;
  
  -- Validate input
  IF admin_email IS NULL OR admin_email = '' THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Email is required'
    );
  END IF;
  
  IF admin_password IS NULL OR admin_password = '' THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Password is required'
    );
  END IF;
  
  -- Create the auth user using Supabase Auth API
  -- Note: This will trigger the handle_new_user() function automatically
  SELECT auth.uid() INTO new_user_id;
  
  -- For now, return instructions since we can't directly create auth users from SQL
  RETURN jsonb_build_object(
    'success', false,
    'message', 'Manual Superadmin creation must be done through Supabase Auth. Please use the signup flow and then call assign_first_superadmin().',
    'next_step', 'After creating user via signup, call: SELECT public.assign_first_superadmin(''user_id_here'');'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.assign_first_superadmin(target_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  superadmin_count INTEGER;
  user_exists BOOLEAN;
BEGIN
  -- Check if any Superadmin already exists
  SELECT COUNT(*) INTO superadmin_count
  FROM public.user_company_roles 
  WHERE role = 'superadmin' AND is_active = true;
  
  IF superadmin_count > 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'A Superadmin already exists. Only one Superadmin can be created.'
    );
  END IF;
  
  -- Check if user exists in profiles
  SELECT EXISTS(
    SELECT 1 FROM public.profiles WHERE user_id = target_user_id
  ) INTO user_exists;
  
  IF NOT user_exists THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'User not found in profiles table'
    );
  END IF;
  
  -- Create a dummy company for the Superadmin
  INSERT INTO public.companies (
    name, 
    street_address, 
    state_id, 
    zip_code,
    payment_day
  ) VALUES (
    'SYSTEM_SUPERADMIN', 
    'System Administrator', 
    'TX', 
    '00000',
    1
  ) ON CONFLICT DO NOTHING;
  
  -- Assign Superadmin role
  INSERT INTO public.user_company_roles (
    user_id,
    company_id,
    role,
    is_active,
    permissions
  ) VALUES (
    target_user_id,
    (SELECT id FROM public.companies WHERE name = 'SYSTEM_SUPERADMIN' LIMIT 1),
    'superadmin',
    true,
    '["manage_companies", "view_system_stats"]'::jsonb
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'First Superadmin created successfully',
    'user_id', target_user_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.needs_initial_setup()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  superadmin_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO superadmin_count
  FROM public.user_company_roles 
  WHERE role = 'superadmin' AND is_active = true;
  
  RETURN superadmin_count = 0;
END;
$$;

-- Log the completion of security fixes
INSERT INTO public.system_stats (stat_type, stat_value)
VALUES ('security_fixes_completed', jsonb_build_object(
  'timestamp', now(),
  'remaining_functions_fixed', jsonb_build_array(
    'can_delete_test_company',
    'delete_test_company', 
    'create_first_superadmin',
    'assign_first_superadmin',
    'needs_initial_setup'
  ),
  'all_function_search_paths', 'secured'
));