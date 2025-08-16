-- ==================================================================
-- COMPREHENSIVE SOLUTION FOR SUPABASE PERFORMANCE RECOMMENDATIONS
-- ==================================================================

-- STEP 1: Add indexes for unindexed foreign keys
-- ==================================================================

-- Add index for driver_period_calculations.paid_by
CREATE INDEX IF NOT EXISTS idx_driver_period_calculations_paid_by 
ON public.driver_period_calculations(paid_by);

-- Add index for driver_profiles.license_state
CREATE INDEX IF NOT EXISTS idx_driver_profiles_license_state 
ON public.driver_profiles(license_state);

-- Add index for expense_instances.expense_type_id
CREATE INDEX IF NOT EXISTS idx_expense_instances_expense_type_id 
ON public.expense_instances(expense_type_id);

-- Add index for expense_template_history.template_id (conditional)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'expense_template_history') THEN
    CREATE INDEX IF NOT EXISTS idx_expense_template_history_template_id 
    ON public.expense_template_history(template_id);
  END IF;
END $$;

-- Add index for fuel_expenses.vehicle_id
CREATE INDEX IF NOT EXISTS idx_fuel_expenses_vehicle_id 
ON public.fuel_expenses(vehicle_id);

-- Add index for loads.broker_dispatcher_id (conditional)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'loads' AND column_name = 'broker_dispatcher_id') THEN
    CREATE INDEX IF NOT EXISTS idx_loads_broker_dispatcher_id 
    ON public.loads(broker_dispatcher_id);
  END IF;
END $$;

-- Add index for payment_methods.company_id
CREATE INDEX IF NOT EXISTS idx_payment_methods_company_id 
ON public.payment_methods(company_id);

-- Add index for user_invitations.accepted_by (conditional)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_invitations') THEN
    CREATE INDEX IF NOT EXISTS idx_user_invitations_accepted_by 
    ON public.user_invitations(accepted_by);
  END IF;
END $$;

-- Add index for user_invitations.target_user_id (conditional)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_invitations') THEN
    CREATE INDEX IF NOT EXISTS idx_user_invitations_target_user_id 
    ON public.user_invitations(target_user_id);
  END IF;
END $$;

-- STEP 2: Remove all unused indexes to clean up the database
-- ==================================================================

-- Remove unused geotab indexes
DROP INDEX IF EXISTS public.idx_geotab_vehicle_assignments_driver_id;
DROP INDEX IF EXISTS public.idx_geotab_vehicle_assignments_vehicle_id;

-- Remove unused document indexes
DROP INDEX IF EXISTS public.idx_load_documents_archived_by;
DROP INDEX IF EXISTS public.idx_company_documents_archived_by;
DROP INDEX IF EXISTS public.idx_equipment_documents_archived_by;

-- Remove unused load indexes
DROP INDEX IF EXISTS public.idx_loads_internal_dispatcher_id;

-- Remove unused payment indexes
DROP INDEX IF EXISTS public.idx_payment_reports_payment_method_id;
DROP INDEX IF EXISTS public.idx_payment_methods_created_by;

-- Remove unused audit and system indexes
DROP INDEX IF EXISTS public.idx_security_audit_log_user_id;
DROP INDEX IF EXISTS public.idx_system_backups_created_by;

-- Remove unused company indexes
DROP INDEX IF EXISTS public.idx_companies_state_id;

-- Remove unused deployment indexes
DROP INDEX IF EXISTS public.idx_deployment_log_initiated_by;

-- Remove unused fuel expense indexes
DROP INDEX IF EXISTS public.idx_fuel_expenses_driver_user_id;

-- Remove unused user role indexes
DROP INDEX IF EXISTS public.idx_user_company_roles_delegated_by;

-- ==================================================================
-- VERIFICATION: The following indexes should now exist and be used:
-- - idx_driver_period_calculations_paid_by
-- - idx_driver_profiles_license_state  
-- - idx_expense_instances_expense_type_id
-- - idx_expense_template_history_template_id (if table exists)
-- - idx_fuel_expenses_vehicle_id
-- - idx_loads_broker_dispatcher_id (if column exists)
-- - idx_payment_methods_company_id
-- - idx_user_invitations_accepted_by (if table exists)
-- - idx_user_invitations_target_user_id (if table exists)
-- ==================================================================