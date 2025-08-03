-- SOLUCIÓN COMPLETA: Crear todos los índices faltantes Y eliminar todos los unused
-- Esto eliminará las 21 sugerencias completamente

-- PASO 1: Eliminar todos los índices "unused" 
DROP INDEX IF EXISTS idx_fuel_expenses_driver_user_id;
DROP INDEX IF EXISTS idx_loads_payment_period_id;
DROP INDEX IF EXISTS idx_loads_internal_dispatcher_id;
DROP INDEX IF EXISTS idx_payment_methods_company_id;

-- PASO 2: Crear todos los índices para foreign keys sin índice
CREATE INDEX IF NOT EXISTS idx_companies_city_id ON public.companies(city_id);
CREATE INDEX IF NOT EXISTS idx_companies_state_id ON public.companies(state_id);
CREATE INDEX IF NOT EXISTS idx_company_documents_archived_by ON public.company_documents(archived_by);
CREATE INDEX IF NOT EXISTS idx_driver_period_calculations_paid_by ON public.driver_period_calculations(paid_by);
CREATE INDEX IF NOT EXISTS idx_driver_profiles_license_state ON public.driver_profiles(license_state);
CREATE INDEX IF NOT EXISTS idx_equipment_documents_archived_by ON public.equipment_documents(archived_by);
CREATE INDEX IF NOT EXISTS idx_expense_instances_expense_type_id ON public.expense_instances(expense_type_id);
CREATE INDEX IF NOT EXISTS idx_expense_template_history_template_id ON public.expense_template_history(template_id);
CREATE INDEX IF NOT EXISTS idx_fuel_expenses_vehicle_id ON public.fuel_expenses(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_load_documents_archived_by ON public.load_documents(archived_by);
CREATE INDEX IF NOT EXISTS idx_loads_client_contact_id ON public.loads(client_contact_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_created_by ON public.payment_methods(created_by);
CREATE INDEX IF NOT EXISTS idx_payment_reports_payment_method_id ON public.payment_reports(payment_method_id);
CREATE INDEX IF NOT EXISTS idx_security_audit_log_user_id ON public.security_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_user_company_roles_delegated_by ON public.user_company_roles(delegated_by);

-- Geotab tables (si existen)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'geotab_vehicle_assignments') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_geotab_vehicle_assignments_driver_id ON public.geotab_vehicle_assignments(driver_id)';
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_geotab_vehicle_assignments_vehicle_id ON public.geotab_vehicle_assignments(vehicle_id)';
    END IF;
END
$$;