-- ===============================================================
-- SOLUTION CORRECTA: Análisis real de foreign keys vs índices
-- ===============================================================

-- Primero, eliminar SOLO los índices que realmente no son necesarios
-- (los que creé sin entender que las foreign keys SÍ necesitan índices)
DROP INDEX IF EXISTS public.idx_driver_period_calculations_paid_by;
DROP INDEX IF EXISTS public.idx_driver_profiles_license_state;
DROP INDEX IF EXISTS public.idx_expense_instances_expense_type_id;
DROP INDEX IF EXISTS public.idx_expense_template_history_template_id;
DROP INDEX IF EXISTS public.idx_fuel_expenses_vehicle_id;
DROP INDEX IF EXISTS public.idx_payment_methods_company_id;
DROP INDEX IF EXISTS public.idx_user_invitations_accepted_by;
DROP INDEX IF EXISTS public.idx_user_invitations_target_user_id;

-- Ahora crear CORRECTAMENTE los índices para todas las foreign keys
-- Cada foreign key NECESITA un índice para performance óptima

-- companies.state_id foreign key
CREATE INDEX IF NOT EXISTS idx_companies_state_id ON public.companies(state_id);

-- company_documents.archived_by foreign key  
CREATE INDEX IF NOT EXISTS idx_company_documents_archived_by ON public.company_documents(archived_by);

-- deployment_log.initiated_by foreign key
CREATE INDEX IF NOT EXISTS idx_deployment_log_initiated_by ON public.deployment_log(initiated_by);

-- equipment_documents.archived_by foreign key
CREATE INDEX IF NOT EXISTS idx_equipment_documents_archived_by ON public.equipment_documents(archived_by);

-- fuel_expenses.driver_user_id foreign key (fk_fuel_expenses_driver)
CREATE INDEX IF NOT EXISTS idx_fuel_expenses_driver_user_id ON public.fuel_expenses(driver_user_id);

-- geotab_vehicle_assignments foreign keys
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'geotab_vehicle_assignments') THEN
    CREATE INDEX IF NOT EXISTS idx_geotab_vehicle_assignments_driver_id ON public.geotab_vehicle_assignments(driver_id);
    CREATE INDEX IF NOT EXISTS idx_geotab_vehicle_assignments_vehicle_id ON public.geotab_vehicle_assignments(vehicle_id);
  END IF;
END $$;

-- load_documents.archived_by foreign key
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'load_documents') THEN
    CREATE INDEX IF NOT EXISTS idx_load_documents_archived_by ON public.load_documents(archived_by);
  END IF;
END $$;

-- loads foreign keys
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'loads' AND column_name = 'broker_dispatcher_id') THEN
    CREATE INDEX IF NOT EXISTS idx_loads_broker_dispatcher_id ON public.loads(broker_dispatcher_id);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'loads' AND column_name = 'internal_dispatcher_id') THEN
    CREATE INDEX IF NOT EXISTS idx_loads_internal_dispatcher_id ON public.loads(internal_dispatcher_id);
  END IF;
END $$;

-- payment_methods.created_by foreign key
CREATE INDEX IF NOT EXISTS idx_payment_methods_created_by ON public.payment_methods(created_by);

-- payment_reports.payment_method_id foreign key
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payment_reports') THEN
    CREATE INDEX IF NOT EXISTS idx_payment_reports_payment_method_id ON public.payment_reports(payment_method_id);
  END IF;
END $$;

-- security_audit_log.user_id foreign key
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'security_audit_log') THEN
    CREATE INDEX IF NOT EXISTS idx_security_audit_log_user_id ON public.security_audit_log(user_id);
  END IF;
END $$;

-- system_backups.created_by foreign key
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'system_backups') THEN
    CREATE INDEX IF NOT EXISTS idx_system_backups_created_by ON public.system_backups(created_by);
  END IF;
END $$;

-- user_company_roles.delegated_by foreign key
CREATE INDEX IF NOT EXISTS idx_user_company_roles_delegated_by ON public.user_company_roles(delegated_by);