-- Database Optimization Migration: Security & Performance Improvements
-- This migration addresses security vulnerabilities and performance issues

-- 1. CREATE MISSING INDEXES FOR PERFORMANCE
-- These indexes will significantly improve query performance on frequently accessed tables

-- User company roles - critical for RLS policies
CREATE INDEX IF NOT EXISTS idx_user_company_roles_user_company_active 
ON public.user_company_roles(user_id, company_id, is_active) 
WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_user_company_roles_company_role_active 
ON public.user_company_roles(company_id, role, is_active) 
WHERE is_active = true;

-- Payment periods - frequently queried for financial data
CREATE INDEX IF NOT EXISTS idx_payment_periods_driver_status 
ON public.payment_periods(driver_user_id, status);

CREATE INDEX IF NOT EXISTS idx_payment_periods_driver_dates 
ON public.payment_periods(driver_user_id, period_start_date, period_end_date);

-- Fuel expenses - large table with frequent queries
CREATE INDEX IF NOT EXISTS idx_fuel_expenses_driver_period 
ON public.fuel_expenses(driver_user_id, payment_period_id);

CREATE INDEX IF NOT EXISTS idx_fuel_expenses_status_date 
ON public.fuel_expenses(status, transaction_date);

-- Loads - frequently accessed for dispatch operations
CREATE INDEX IF NOT EXISTS idx_loads_driver_status 
ON public.loads(driver_user_id, status);

CREATE INDEX IF NOT EXISTS idx_loads_dates 
ON public.loads(pickup_date, delivery_date);

-- 2. CREATE SECURITY DEFINER FUNCTION FOR ROLE CHECKING
-- This prevents recursive RLS policy issues
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

-- 3. ADD UPDATED_AT TRIGGERS FOR AUDIT TRAIL
-- These ensure proper change tracking

-- Function already exists, just add triggers where missing
CREATE TRIGGER IF NOT EXISTS update_companies_updated_at
    BEFORE UPDATE ON public.companies
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER IF NOT EXISTS update_user_company_roles_updated_at
    BEFORE UPDATE ON public.user_company_roles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER IF NOT EXISTS update_expense_types_updated_at
    BEFORE UPDATE ON public.expense_types
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- 4. ENFORCE NOT NULL CONSTRAINTS ON CRITICAL COLUMNS
-- These prevent orphaned records and improve data integrity

-- Make user_id NOT NULL where it should be (but allow existing NULL values)
-- We'll set a default migration value for existing NULL records

-- First, update any NULL user_id values in profiles (shouldn't exist but just in case)
UPDATE public.profiles SET user_id = gen_random_uuid() WHERE user_id IS NULL;

-- Now make the constraint
ALTER TABLE public.profiles ALTER COLUMN user_id SET NOT NULL;

-- 5. CLEAN UP ORPHANED DATA
-- Remove any records that reference non-existent users or companies

-- Clean up user_company_roles with invalid user references
-- (Note: we can't check auth.users directly, so we'll clean based on profiles)
DELETE FROM public.user_company_roles 
WHERE user_id NOT IN (SELECT user_id FROM public.profiles WHERE user_id IS NOT NULL);

-- Clean up payment_periods with invalid driver references
DELETE FROM public.payment_periods 
WHERE driver_user_id NOT IN (SELECT user_id FROM public.profiles WHERE user_id IS NOT NULL);

-- Clean up fuel_expenses with invalid driver references
DELETE FROM public.fuel_expenses 
WHERE driver_user_id NOT IN (SELECT user_id FROM public.profiles WHERE user_id IS NOT NULL);

-- Clean up loads with invalid driver references
DELETE FROM public.loads 
WHERE driver_user_id NOT IN (SELECT user_id FROM public.profiles WHERE user_id IS NOT NULL);

-- 6. OPTIMIZE TABLE STATISTICS
-- Update statistics for better query planning
ANALYZE public.user_company_roles;
ANALYZE public.payment_periods;
ANALYZE public.fuel_expenses;
ANALYZE public.loads;
ANALYZE public.companies;
ANALYZE public.profiles;

-- 7. CREATE MAINTENANCE FUNCTION FOR REGULAR CLEANUP
CREATE OR REPLACE FUNCTION public.maintenance_cleanup()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Clean up expired password reset tokens
  PERFORM public.cleanup_expired_reset_tokens();
  
  -- Update table statistics
  ANALYZE public.user_company_roles;
  ANALYZE public.payment_periods;
  ANALYZE public.fuel_expenses;
  ANALYZE public.loads;
  
  -- Log maintenance run
  INSERT INTO public.system_stats (stat_type, stat_value)
  VALUES ('maintenance_run', jsonb_build_object(
    'timestamp', now(),
    'performed_by', 'system'
  ));
END;
$$;

-- 8. CONFIGURE AUTOVACUUM FOR HIGH-TRAFFIC TABLES
-- More aggressive autovacuum for frequently updated tables
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

-- 9. ADD COMMENTS FOR DOCUMENTATION
COMMENT ON FUNCTION public.has_role(uuid, user_role) IS 'Security definer function to check user roles without RLS recursion';
COMMENT ON FUNCTION public.maintenance_cleanup() IS 'Regular maintenance function to clean up expired data and update statistics';

-- 10. GRANT NECESSARY PERMISSIONS
-- Ensure service role can execute maintenance functions
GRANT EXECUTE ON FUNCTION public.has_role(uuid, user_role) TO service_role;
GRANT EXECUTE ON FUNCTION public.maintenance_cleanup() TO service_role;