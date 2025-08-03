-- FASE 1: Eliminar índices de auditoría y funcionalidades auxiliares
-- Estos son los menos críticos para el funcionamiento del sistema

-- Índices de auditoría (archived_by) - raramente consultados
DROP INDEX IF EXISTS idx_company_documents_archived_by;
DROP INDEX IF EXISTS idx_equipment_documents_archived_by;
DROP INDEX IF EXISTS idx_load_documents_archived_by;

-- Índices de funcionalidades auxiliares poco usadas
DROP INDEX IF EXISTS idx_security_audit_log_user_id;
DROP INDEX IF EXISTS idx_user_company_roles_delegated_by;
DROP INDEX IF EXISTS idx_expense_template_history_template_id;

-- Índices geográficos (si no se hacen búsquedas por ciudad/estado)
DROP INDEX IF EXISTS idx_companies_city_id;
DROP INDEX IF EXISTS idx_companies_state_id;

-- Índices de Geotab (funcionalidad externa opcional)
DROP INDEX IF EXISTS idx_geotab_vehicle_assignments_driver_id;
DROP INDEX IF EXISTS idx_geotab_vehicle_assignments_vehicle_id;

-- Eliminando 10 índices en esta fase
-- Quedarán ~12 índices "unused" más críticos para el sistema