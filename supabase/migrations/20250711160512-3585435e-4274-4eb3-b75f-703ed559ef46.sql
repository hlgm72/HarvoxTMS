-- Database Optimization Migration: Security & Performance Improvements (Fixed)
-- This migration addresses security vulnerabilities and performance issues

-- 1. CREATE MISSING INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_user_company_roles_user_company_active 
ON public.user_company_roles(user_id, company_id, is_active) 
WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_user_company_roles_company_role_active 
ON public.user_company_roles(company_id, role, is_active) 
WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_payment_periods_driver_status 
ON public.payment_periods(driver_user_id, status);

CREATE INDEX IF NOT EXISTS idx_payment_periods_driver_dates 
ON public.payment_periods(driver_user_id, period_start_date, period_end_date);

CREATE INDEX IF NOT EXISTS idx_fuel_expenses_driver_period 
ON public.fuel_expenses(driver_user_id, payment_period_id);

CREATE INDEX IF NOT EXISTS idx_fuel_expenses_status_date 
ON public.fuel_expenses(status, transaction_date);

CREATE INDEX IF NOT EXISTS idx_loads_driver_status 
ON public.loads(driver_user_id, status);

CREATE INDEX IF NOT EXISTS idx_loads_dates 
ON public.loads(pickup_date, delivery_date);

-- 2. CREATE SECURITY DEFINER FUNCTION FOR ROLE CHECKING
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role user_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_company_roles
    WHERE user_id = _user_id
      AND role = _role
      AND is_active = true
  );
$$;

-- 3. ADD UPDATED_AT TRIGGERS (drop first if they exist)
DROP TRIGGER IF EXISTS update_companies_updated_at ON public.companies;
CREATE TRIGGER update_companies_updated_at
    BEFORE UPDATE ON public.companies
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_company_roles_updated_at ON public.user_company_roles;
CREATE TRIGGER update_user_company_roles_updated_at
    BEFORE UPDATE ON public.user_company_roles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_expense_types_updated_at ON public.expense_types;
CREATE TRIGGER update_expense_types_updated_at
    BEFORE UPDATE ON public.expense_types
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- 4. CLEAN UP ORPHANED DATA
DELETE FROM public.user_company_roles 
WHERE user_id NOT IN (SELECT user_id FROM public.profiles WHERE user_id IS NOT NULL);

DELETE FROM public.payment_periods 
WHERE driver_user_id NOT IN (SELECT user_id FROM public.profiles WHERE user_id IS NOT NULL);

DELETE FROM public.fuel_expenses 
WHERE driver_user_id NOT IN (SELECT user_id FROM public.profiles WHERE user_id IS NOT NULL);

DELETE FROM public.loads 
WHERE driver_user_id NOT IN (SELECT user_id FROM public.profiles WHERE user_id IS NOT NULL);

-- 5. OPTIMIZE TABLE STATISTICS
ANALYZE public.user_company_roles;
ANALYZE public.payment_periods;
ANALYZE public.fuel_expenses;
ANALYZE public.loads;
ANALYZE public.companies;
ANALYZE public.profiles;

-- 6. CREATE MAINTENANCE FUNCTION
CREATE OR REPLACE FUNCTION public.maintenance_cleanup()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM public.cleanup_expired_reset_tokens();
  
  ANALYZE public.user_company_roles;
  ANALYZE public.payment_periods;
  ANALYZE public.fuel_expenses;
  ANALYZE public.loads;
  
  INSERT INTO public.system_stats (stat_type, stat_value)
  VALUES ('maintenance_run', jsonb_build_object(
    'timestamp', now(),
    'performed_by', 'system'
  ));
END;
$$;

-- 7. CONFIGURE AUTOVACUUM FOR HIGH-TRAFFIC TABLES
ALTER TABLE public.user_company_roles SET (
  autovacuum_vacuum_scale_factor = 0.1,
  autovacuum_analyze_scale_factor = 0.05
);

ALTER TABLE public.payment_periods SET (
  autovacuum_vacuum_scale_factor = 0.1,
  autovacuum_analyze_scale_factor = 0.05
);

ALTER TABLE public.fuel_expenses SET (
  autovacuum_vacuum_scale_factor = 0.15,
  autovacuum_analyze_scale_factor = 0.1
);

-- 8. ADD DOCUMENTATION
COMMENT ON FUNCTION public.has_role(uuid, user_role) IS 'Security definer function to check user roles without RLS recursion';
COMMENT ON FUNCTION public.maintenance_cleanup() IS 'Regular maintenance function to clean up expired data and update statistics';

-- 9. GRANT PERMISSIONS
GRANT EXECUTE ON FUNCTION public.has_role(uuid, user_role) TO service_role;
GRANT EXECUTE ON FUNCTION public.maintenance_cleanup() TO service_role;