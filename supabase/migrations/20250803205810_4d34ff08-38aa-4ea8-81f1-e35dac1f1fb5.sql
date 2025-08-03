-- Add indexes for unindexed foreign keys to improve query performance

-- Index for company_documents.archived_by foreign key
CREATE INDEX IF NOT EXISTS idx_company_documents_archived_by 
ON public.company_documents (archived_by);

-- Index for driver_period_calculations.paid_by foreign key  
CREATE INDEX IF NOT EXISTS idx_driver_period_calculations_paid_by 
ON public.driver_period_calculations (paid_by);

-- Index for equipment_documents.archived_by foreign key
CREATE INDEX IF NOT EXISTS idx_equipment_documents_archived_by 
ON public.equipment_documents (archived_by);

-- Index for load_documents.archived_by foreign key
CREATE INDEX IF NOT EXISTS idx_load_documents_archived_by 
ON public.load_documents (archived_by);

-- Index for loads.internal_dispatcher_id foreign key
CREATE INDEX IF NOT EXISTS idx_loads_internal_dispatcher_id 
ON public.loads (internal_dispatcher_id);

-- Index for security_audit_log.user_id foreign key
CREATE INDEX IF NOT EXISTS idx_security_audit_log_user_id 
ON public.security_audit_log (user_id);