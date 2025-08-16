-- FIXED SECURITY: Correct syntax for policies and secure all tables
-- Fix syntax error and properly secure all vulnerable tables

-- ===== 1. SECURE COMPANIES_PUBLIC VIEW =====
REVOKE ALL ON public.companies_public FROM PUBLIC;
REVOKE ALL ON public.companies_public FROM anon;
GRANT SELECT ON public.companies_public TO authenticated;

-- ===== 2. SECURE LOAD AND ROUTE DATA =====
-- Secure load_details_with_dates view if it exists
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'load_details_with_dates' AND table_schema = 'public') THEN
    EXECUTE 'REVOKE ALL ON public.load_details_with_dates FROM PUBLIC';
    EXECUTE 'REVOKE ALL ON public.load_details_with_dates FROM anon';
    EXECUTE 'GRANT SELECT ON public.load_details_with_dates TO authenticated';
  END IF;
END $$;

-- Secure loads_complete view if it exists
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'loads_complete' AND table_schema = 'public') THEN
    EXECUTE 'REVOKE ALL ON public.loads_complete FROM PUBLIC';
    EXECUTE 'REVOKE ALL ON public.loads_complete FROM anon';
    EXECUTE 'GRANT SELECT ON public.loads_complete TO authenticated';
  END IF;
END $$;

-- Secure equipment_status_summary view if it exists
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'equipment_status_summary' AND table_schema = 'public') THEN
    EXECUTE 'REVOKE ALL ON public.equipment_status_summary FROM PUBLIC';
    EXECUTE 'REVOKE ALL ON public.equipment_status_summary FROM anon';
    EXECUTE 'GRANT SELECT ON public.equipment_status_summary TO authenticated';
  END IF;
END $$;

-- ===== 3. SECURE SYSTEM TABLES =====
-- Drop existing policies first, then create new ones

-- Secure system_health_log
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'system_health_log' AND table_schema = 'public') THEN
    EXECUTE 'ALTER TABLE public.system_health_log ENABLE ROW LEVEL SECURITY';
    EXECUTE 'REVOKE ALL ON public.system_health_log FROM PUBLIC';
    EXECUTE 'REVOKE ALL ON public.system_health_log FROM anon';
    EXECUTE 'REVOKE ALL ON public.system_health_log FROM authenticated';
    
    -- Drop existing policy if it exists
    EXECUTE 'DROP POLICY IF EXISTS system_health_log_superadmin_only ON public.system_health_log';
    
    -- Create new policy for superadmins only
    EXECUTE 'CREATE POLICY system_health_log_superadmin_only ON public.system_health_log FOR ALL USING (
      (SELECT auth.role()) = ''authenticated'' AND 
      (SELECT auth.uid()) IS NOT NULL AND 
      COALESCE(((SELECT auth.jwt()) ->> ''is_anonymous'')::boolean, false) = false AND 
      EXISTS (
        SELECT 1 FROM user_company_roles
        WHERE user_id = (SELECT auth.uid()) 
        AND role = ''superadmin'' 
        AND is_active = true
      )
    )';
  END IF;
END $$;

-- Secure system_backups
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'system_backups' AND table_schema = 'public') THEN
    EXECUTE 'ALTER TABLE public.system_backups ENABLE ROW LEVEL SECURITY';
    EXECUTE 'REVOKE ALL ON public.system_backups FROM PUBLIC';
    EXECUTE 'REVOKE ALL ON public.system_backups FROM anon';
    EXECUTE 'REVOKE ALL ON public.system_backups FROM authenticated';
    
    -- Drop existing policy if it exists
    EXECUTE 'DROP POLICY IF EXISTS system_backups_superadmin_only ON public.system_backups';
    
    -- Create new policy for superadmins only
    EXECUTE 'CREATE POLICY system_backups_superadmin_only ON public.system_backups FOR ALL USING (
      (SELECT auth.role()) = ''authenticated'' AND 
      (SELECT auth.uid()) IS NOT NULL AND 
      COALESCE(((SELECT auth.jwt()) ->> ''is_anonymous'')::boolean, false) = false AND 
      EXISTS (
        SELECT 1 FROM user_company_roles
        WHERE user_id = (SELECT auth.uid()) 
        AND role = ''superadmin'' 
        AND is_active = true
      )
    )';
  END IF;
END $$;

-- Add security documentation
COMMENT ON VIEW public.companies_public IS 'SECURED: Public company data view - restricted to authenticated users only. Contains basic company information.';
COMMENT ON VIEW public.companies_financial IS 'SECURED: Financial company data view - access controlled through underlying table RLS. Contains sensitive financial information restricted to authorized company members.';