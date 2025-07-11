-- Comprehensive database optimization to address Performance Advisor warnings
-- This addresses common issues that cause hundreds of warnings

-- 1. Drop ALL existing custom indexes first (clean slate approach)
DO $$ 
DECLARE
    r RECORD;
BEGIN
    -- Drop all custom indexes (keep only system/constraint indexes)
    FOR r IN 
        SELECT schemaname, tablename, indexname 
        FROM pg_indexes 
        WHERE schemaname = 'public' 
        AND indexname LIKE 'idx_%'
        AND indexname NOT LIKE '%_pkey'
        AND indexname NOT LIKE '%_key'
    LOOP
        EXECUTE 'DROP INDEX IF EXISTS ' || quote_ident(r.schemaname) || '.' || quote_ident(r.indexname);
    END LOOP;
END $$;

-- 2. Create essential indexes for primary foreign key relationships only
CREATE INDEX IF NOT EXISTS idx_companies_state_id ON public.companies(state_id) WHERE state_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_companies_city_id ON public.companies(city_id) WHERE city_id IS NOT NULL;

-- User and company relationships
CREATE INDEX IF NOT EXISTS idx_user_company_roles_user_id ON public.user_company_roles(user_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_user_company_roles_company_id ON public.user_company_roles(company_id) WHERE is_active = true;

-- Driver relationships
CREATE INDEX IF NOT EXISTS idx_driver_profiles_user_id ON public.driver_profiles(user_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_company_drivers_user_id ON public.company_drivers(user_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_owner_operators_user_id ON public.owner_operators(user_id) WHERE is_active = true;

-- Financial relationships (payment periods are heavily queried)
CREATE INDEX IF NOT EXISTS idx_payment_periods_driver_user_id ON public.payment_periods(driver_user_id);
CREATE INDEX IF NOT EXISTS idx_payment_periods_status ON public.payment_periods(status) WHERE status IN ('draft', 'approved', 'paid');

-- Fuel expenses (often queried by driver and period)
CREATE INDEX IF NOT EXISTS idx_fuel_expenses_driver_user_id ON public.fuel_expenses(driver_user_id);
CREATE INDEX IF NOT EXISTS idx_fuel_expenses_period_driver ON public.fuel_expenses(payment_period_id, driver_user_id);

-- Loads (business critical)
CREATE INDEX IF NOT EXISTS idx_loads_driver_user_id ON public.loads(driver_user_id);
CREATE INDEX IF NOT EXISTS idx_loads_status ON public.loads(status) WHERE status IN ('created', 'in_progress', 'completed');

-- 3. Analyze tables to update statistics
ANALYZE public.companies;
ANALYZE public.user_company_roles;
ANALYZE public.driver_profiles;
ANALYZE public.payment_periods;
ANALYZE public.fuel_expenses;
ANALYZE public.loads;

-- 4. Log the comprehensive optimization
INSERT INTO public.system_stats (stat_type, stat_value)
VALUES ('comprehensive_db_optimization', jsonb_build_object(
  'timestamp', now(),
  'description', 'Comprehensive database cleanup and optimization to resolve Performance Advisor warnings',
  'indexes_recreated', 'minimal_essential_set',
  'approach', 'clean_slate_with_strategic_indexing'
));