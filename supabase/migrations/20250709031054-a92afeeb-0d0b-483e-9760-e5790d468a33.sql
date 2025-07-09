-- Create function to setup first Superadmin
-- This function can only be called once and only if no Superadmin exists

CREATE OR REPLACE FUNCTION public.create_first_superadmin(
  admin_email TEXT,
  admin_password TEXT,
  admin_first_name TEXT DEFAULT 'Super',
  admin_last_name TEXT DEFAULT 'Admin'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Create function to assign Superadmin role to first user
CREATE OR REPLACE FUNCTION public.assign_first_superadmin(target_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
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
  
  -- Create a dummy company for the Superadmin (they don't belong to any real company)
  -- This is needed because user_company_roles requires a company_id
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

-- Create function to check if system needs initial setup
CREATE OR REPLACE FUNCTION public.needs_initial_setup()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
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