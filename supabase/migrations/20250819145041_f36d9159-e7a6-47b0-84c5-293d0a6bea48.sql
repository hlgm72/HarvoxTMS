-- Fix security warnings: Add SET search_path TO 'public' to functions that need it

-- Fix auto_complete_load_on_pod_upload function
CREATE OR REPLACE FUNCTION public.auto_complete_load_on_pod_upload()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Check if this is a POD document being inserted
  IF NEW.document_type = 'pod' AND TG_OP = 'INSERT' THEN
    -- Update the load status to 'delivered' if it's not already
    UPDATE loads 
    SET 
      status = 'delivered',
      updated_at = now()
    WHERE id = NEW.load_id 
    AND status != 'delivered';
    
    RAISE NOTICE 'Load % automatically marked as delivered due to POD upload', NEW.load_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Fix user_has_company_access function
CREATE OR REPLACE FUNCTION public.user_has_company_access(user_id_param uuid, company_id_param uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_company_roles
    WHERE user_id = user_id_param
      AND company_id = company_id_param
      AND is_active = true
  );
$$;

-- Fix user_is_company_admin function
CREATE OR REPLACE FUNCTION public.user_is_company_admin(user_id_param uuid, company_id_param uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_company_roles
    WHERE user_id = user_id_param
      AND company_id = company_id_param
      AND role IN ('company_owner', 'operations_manager', 'superadmin')
      AND is_active = true
  );
$$;

-- Fix user_has_admin_role function
CREATE OR REPLACE FUNCTION public.user_has_admin_role(user_id_param uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_company_roles
    WHERE user_id = user_id_param
      AND role IN ('company_owner', 'operations_manager', 'superadmin')
      AND is_active = true
  );
$$;