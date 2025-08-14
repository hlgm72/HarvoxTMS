-- Fix missing RLS policies for critical business data tables
-- This implements company-based access control for sensitive tables

-- 1. Enable RLS on equipment_status_summary (view/table)
-- This table contains equipment details that should only be visible to company members
DROP POLICY IF EXISTS "equipment_status_summary_company_access" ON public.equipment_status_summary;
ALTER TABLE public.equipment_status_summary ENABLE ROW LEVEL SECURITY;

CREATE POLICY "equipment_status_summary_company_access" ON public.equipment_status_summary
FOR ALL USING (
  (SELECT auth.role()) = 'authenticated' AND
  (SELECT auth.uid()) IS NOT NULL AND
  COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false AND
  company_id IN (
    SELECT ucr.company_id
    FROM user_company_roles ucr
    WHERE ucr.user_id = (SELECT auth.uid()) 
    AND ucr.is_active = true
  )
) WITH CHECK (
  (SELECT auth.role()) = 'authenticated' AND
  (SELECT auth.uid()) IS NOT NULL AND
  COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false AND
  company_id IN (
    SELECT ucr.company_id
    FROM user_company_roles ucr
    WHERE ucr.user_id = (SELECT auth.uid()) 
    AND ucr.is_active = true
  )
);

-- 2. Create optimized RLS policies for system tables (superadmin only access)
-- These tables contain operational data that should only be accessible to superadmins

-- System backups table
DROP POLICY IF EXISTS "system_backups_superadmin_only" ON public.system_backups;
ALTER TABLE public.system_backups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "system_backups_superadmin_only" ON public.system_backups
FOR ALL USING (
  (SELECT auth.role()) = 'authenticated' AND
  (SELECT auth.uid()) IS NOT NULL AND
  COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false AND
  is_user_superadmin_safe((SELECT auth.uid()))
) WITH CHECK (
  (SELECT auth.role()) = 'authenticated' AND
  (SELECT auth.uid()) IS NOT NULL AND
  COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false AND
  is_user_superadmin_safe((SELECT auth.uid()))
);

-- System health log table
DROP POLICY IF EXISTS "system_health_log_superadmin_only" ON public.system_health_log;
ALTER TABLE public.system_health_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "system_health_log_superadmin_only" ON public.system_health_log
FOR ALL USING (
  (SELECT auth.role()) = 'authenticated' AND
  (SELECT auth.uid()) IS NOT NULL AND
  COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false AND
  is_user_superadmin_safe((SELECT auth.uid()))
) WITH CHECK (
  (SELECT auth.role()) = 'authenticated' AND
  (SELECT auth.uid()) IS NOT NULL AND
  COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false AND
  is_user_superadmin_safe((SELECT auth.uid()))
);

-- 3. Fix password_reset_tokens table to be service role only
-- Remove any user-accessible policies and restrict to service role only
DROP POLICY IF EXISTS "password_reset_tokens_deny_all_users" ON public.password_reset_tokens;
DROP POLICY IF EXISTS "password_reset_tokens_service_only" ON public.password_reset_tokens;

-- Create strict service role only policy
CREATE POLICY "password_reset_tokens_service_only" ON public.password_reset_tokens
FOR ALL USING (
  current_setting('app.service_operation', true) = 'allowed'
) WITH CHECK (
  current_setting('app.service_operation', true) = 'allowed'
);

-- 4. Create helper function to check if user is superadmin (if not exists)
CREATE OR REPLACE FUNCTION public.is_user_superadmin_safe(user_id_param uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_company_roles
    WHERE user_id = user_id_param
    AND role = 'superadmin'
    AND is_active = true
  );
$$;

-- 5. Create helper function to check if user is admin in company (if not exists)
CREATE OR REPLACE FUNCTION public.is_user_admin_in_company_safe(user_id_param uuid, company_id_param uuid)
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

-- 6. Create helper function to get user company IDs safely (if not exists)
CREATE OR REPLACE FUNCTION public.get_user_company_ids_safe(user_id_param uuid)
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