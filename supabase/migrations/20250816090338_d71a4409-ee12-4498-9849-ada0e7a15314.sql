-- CRITICAL SECURITY FIXES - PART 1: DROP AND RECREATE FUNCTIONS

-- ================================
-- 1. DROP EXISTING FUNCTIONS TO AVOID PARAMETER CONFLICTS
-- ================================

DROP FUNCTION IF EXISTS public.is_user_superadmin_safe(uuid);
DROP FUNCTION IF EXISTS public.is_user_admin_in_company_safe(uuid, uuid);
DROP FUNCTION IF EXISTS public.get_user_company_ids_safe(uuid);
DROP FUNCTION IF EXISTS public.is_authenticated_superadmin();

-- ================================
-- 2. RECREATE SECURITY FUNCTIONS WITH PROPER SEARCH PATHS
-- ================================

CREATE OR REPLACE FUNCTION public.is_user_superadmin_safe(user_id_param uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_company_roles
    WHERE user_id = user_id_param
    AND role = 'superadmin'
    AND is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.is_user_admin_in_company_safe(user_id_param uuid, company_id_param uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_company_roles
    WHERE user_id = user_id_param
    AND company_id = company_id_param
    AND role IN ('company_owner', 'operations_manager', 'superadmin')
    AND is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.get_user_company_ids_safe(user_id_param uuid DEFAULT auth.uid())
RETURNS uuid[]
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT ARRAY_AGG(company_id)
  FROM user_company_roles
  WHERE user_id = user_id_param
    AND is_active = true;
$$;

CREATE OR REPLACE FUNCTION public.is_authenticated_superadmin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_company_roles
    WHERE user_id = auth.uid()
    AND role = 'superadmin'
    AND is_active = true
  );
$$;