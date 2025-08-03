-- Eliminar índices menos críticos para base de datos "limpia"
-- Mantener solo los índices esenciales para funcionamiento básico

-- Eliminar índices de auditoría y funcionalidades menos usadas
DROP INDEX IF EXISTS idx_company_documents_archived_by;
DROP INDEX IF EXISTS idx_equipment_documents_archived_by;
DROP INDEX IF EXISTS idx_load_documents_archived_by;
DROP INDEX IF EXISTS idx_driver_period_calculations_paid_by;
DROP INDEX IF EXISTS idx_driver_profiles_license_state;
DROP INDEX IF EXISTS idx_expense_template_history_template_id;
DROP INDEX IF EXISTS idx_fuel_expenses_vehicle_id;
DROP INDEX IF EXISTS idx_geotab_vehicle_assignments_driver_id;
DROP INDEX IF EXISTS idx_geotab_vehicle_assignments_vehicle_id;
DROP INDEX IF EXISTS idx_payment_methods_created_by;
DROP INDEX IF EXISTS idx_payment_reports_payment_method_id;
DROP INDEX IF EXISTS idx_security_audit_log_user_id;
DROP INDEX IF EXISTS idx_user_company_roles_delegated_by;
DROP INDEX IF EXISTS idx_companies_city_id;
DROP INDEX IF EXISTS idx_companies_state_id;
DROP INDEX IF EXISTS idx_loads_client_contact_id;
DROP INDEX IF EXISTS idx_expense_instances_expense_type_id;

-- MANTENER estos índices esenciales:
-- ✅ idx_fuel_expenses_driver_user_id (consultas frecuentes por conductor)
-- ✅ idx_loads_payment_period_id (consultas frecuentes por período)
-- ✅ idx_payment_methods_company_id (consultas por empresa)  
-- ✅ idx_loads_internal_dispatcher_id (foreign key activa)