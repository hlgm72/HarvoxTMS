-- Create indexes for all remaining unindexed foreign keys (corrected)
-- This will eliminate all "unindexed foreign keys" warnings

-- Geographic fields (companies table) 
CREATE INDEX IF NOT EXISTS idx_companies_city_id ON public.companies(city_id);
CREATE INDEX IF NOT EXISTS idx_companies_state_id ON public.companies(state_id);

-- Audit fields (archived_by columns)
CREATE INDEX IF NOT EXISTS idx_company_documents_archived_by ON public.company_documents(archived_by);
CREATE INDEX IF NOT EXISTS idx_equipment_documents_archived_by ON public.equipment_documents(archived_by);
CREATE INDEX IF NOT EXISTS idx_load_documents_archived_by ON public.load_documents(archived_by);

-- Payment tracking fields
CREATE INDEX IF NOT EXISTS idx_driver_period_calculations_paid_by ON public.driver_period_calculations(paid_by);

-- License state (driver profiles)
CREATE INDEX IF NOT EXISTS idx_driver_profiles_license_state ON public.driver_profiles(license_state);

-- Template history
CREATE INDEX IF NOT EXISTS idx_expense_template_history_template_id ON public.expense_template_history(template_id);

-- Vehicle tracking
CREATE INDEX IF NOT EXISTS idx_fuel_expenses_vehicle_id ON public.fuel_expenses(vehicle_id);

-- Geotab integrations (if these tables exist)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'geotab_vehicle_assignments') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_geotab_vehicle_assignments_driver_id ON public.geotab_vehicle_assignments(driver_id)';
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_geotab_vehicle_assignments_vehicle_id ON public.geotab_vehicle_assignments(vehicle_id)';
    END IF;
END
$$;

-- Dispatcher fields (using correct column names from loads table)
DO $$
BEGIN
    -- Check for broker_dispatcher_id column
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'loads' AND column_name = 'broker_dispatcher_id') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_loads_broker_dispatcher_id ON public.loads(broker_dispatcher_id)';
    END IF;
    
    -- Check for internal_dispatcher_id column  
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'loads' AND column_name = 'internal_dispatcher_id') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_loads_internal_dispatcher_id ON public.loads(internal_dispatcher_id)';
    END IF;
END
$$;

-- Payment methods (if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payment_methods') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_payment_methods_company_id ON public.payment_methods(company_id)';
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_payment_methods_created_by ON public.payment_methods(created_by)';
    END IF;
END
$$;

-- Payment reports (if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payment_reports') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_payment_reports_payment_method_id ON public.payment_reports(payment_method_id)';
    END IF;
END
$$;

-- Security audit (if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'security_audit_log') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_security_audit_log_user_id ON public.security_audit_log(user_id)';
    END IF;
END
$$;

-- User company roles delegation
CREATE INDEX IF NOT EXISTS idx_user_company_roles_delegated_by ON public.user_company_roles(delegated_by);