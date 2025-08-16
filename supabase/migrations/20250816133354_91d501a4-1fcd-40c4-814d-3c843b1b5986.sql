-- Add remaining indexes for unindexed foreign keys
-- Check if geotab_vehicle_assignments table exists and add indexes
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'geotab_vehicle_assignments') THEN
    CREATE INDEX IF NOT EXISTS idx_geotab_vehicle_assignments_driver_id ON public.geotab_vehicle_assignments(driver_id);
    CREATE INDEX IF NOT EXISTS idx_geotab_vehicle_assignments_vehicle_id ON public.geotab_vehicle_assignments(vehicle_id);
  END IF;
END $$;

-- Check if load_documents table exists and add index
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'load_documents') THEN
    CREATE INDEX IF NOT EXISTS idx_load_documents_archived_by ON public.load_documents(archived_by);
  END IF;
END $$;

-- Check if loads table exists and add indexes for dispatcher columns
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'loads') THEN
    -- Check if broker_dispatcher_id column exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'loads' AND column_name = 'broker_dispatcher_id') THEN
      CREATE INDEX IF NOT EXISTS idx_loads_broker_dispatcher_id ON public.loads(broker_dispatcher_id);
    END IF;
    -- Check if internal_dispatcher_id column exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'loads' AND column_name = 'internal_dispatcher_id') THEN
      CREATE INDEX IF NOT EXISTS idx_loads_internal_dispatcher_id ON public.loads(internal_dispatcher_id);
    END IF;
  END IF;
END $$;

-- Check if payment_reports table exists and add index
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payment_reports') THEN
    CREATE INDEX IF NOT EXISTS idx_payment_reports_payment_method_id ON public.payment_reports(payment_method_id);
  END IF;
END $$;

-- Check if security_audit_log table exists and add index
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'security_audit_log') THEN
    CREATE INDEX IF NOT EXISTS idx_security_audit_log_user_id ON public.security_audit_log(user_id);
  END IF;
END $$;

-- Check if system_backups table exists and add index
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'system_backups') THEN
    CREATE INDEX IF NOT EXISTS idx_system_backups_created_by ON public.system_backups(created_by);
  END IF;
END $$;