-- Remove unused indexes for better database performance
-- Starting with maintenance and inspection related indexes (features not implemented)

-- Drop maintenance related indexes
DROP INDEX IF EXISTS idx_maintenance_schedules_equipment_id;
DROP INDEX IF EXISTS idx_maintenance_schedules_next_due_date;
DROP INDEX IF EXISTS idx_maintenance_schedules_active;
DROP INDEX IF EXISTS idx_maintenance_records_equipment_id;
DROP INDEX IF EXISTS idx_maintenance_records_performed_date;
DROP INDEX IF EXISTS idx_maintenance_records_status;

-- Drop inspection related indexes  
DROP INDEX IF EXISTS idx_inspections_equipment_id;
DROP INDEX IF EXISTS idx_inspections_date;
DROP INDEX IF EXISTS idx_inspections_type;
DROP INDEX IF EXISTS idx_inspections_status;

-- Drop archive related indexes (archive functionality not actively used)
DROP INDEX IF EXISTS loads_archive_status_idx;
DROP INDEX IF EXISTS loads_archive_driver_user_id_payment_period_id_idx;
DROP INDEX IF EXISTS loads_archive_driver_user_id_payment_period_id_created_at_idx;
DROP INDEX IF EXISTS loads_archive_broker_dispatcher_id_idx;
DROP INDEX IF EXISTS loads_archive_driver_user_id_idx;
DROP INDEX IF EXISTS loads_archive_payment_period_id_idx;
DROP INDEX IF EXISTS loads_archive_created_at_idx;
DROP INDEX IF EXISTS loads_archive_updated_at_idx;