-- Recrear índices necesarios para foreign keys activas
-- Estas mejoran significativamente el rendimiento de las consultas con JOINs

-- Geographic foreign keys (companies table)
CREATE INDEX IF NOT EXISTS idx_companies_city_id ON public.companies(city_id);
CREATE INDEX IF NOT EXISTS idx_companies_state_id ON public.companies(state_id);

-- Audit trail foreign keys (archived_by columns)
CREATE INDEX IF NOT EXISTS idx_company_documents_archived_by ON public.company_documents(archived_by);
CREATE INDEX IF NOT EXISTS idx_equipment_documents_archived_by ON public.equipment_documents(archived_by);
CREATE INDEX IF NOT EXISTS idx_load_documents_archived_by ON public.load_documents(archived_by);

-- Template history foreign key
CREATE INDEX IF NOT EXISTS idx_expense_template_history_template_id ON public.expense_template_history(template_id);

-- Vehicle tracking foreign key
CREATE INDEX IF NOT EXISTS idx_fuel_expenses_vehicle_id ON public.fuel_expenses(vehicle_id);

-- Geotab integrations foreign keys (if tables exist)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'geotab_vehicle_assignments') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_geotab_vehicle_assignments_driver_id ON public.geotab_vehicle_assignments(driver_id)';
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_geotab_vehicle_assignments_vehicle_id ON public.geotab_vehicle_assignments(vehicle_id)';
    END IF;
END
$$;

-- Payment and audit foreign keys
CREATE INDEX IF NOT EXISTS idx_payment_methods_created_by ON public.payment_methods(created_by);
CREATE INDEX IF NOT EXISTS idx_payment_reports_payment_method_id ON public.payment_reports(payment_method_id);
CREATE INDEX IF NOT EXISTS idx_security_audit_log_user_id ON public.security_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_user_company_roles_delegated_by ON public.user_company_roles(delegated_by);

-- Dispatcher foreign key (check if broker_dispatcher_id column exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'loads' 
               AND column_name = 'broker_dispatcher_id' 
               AND table_schema = 'public') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_loads_broker_dispatcher_id ON public.loads(broker_dispatcher_id)';
    END IF;
END
$$;