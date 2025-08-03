-- ESTRATEGIA INTELIGENTE: Corregir el error + eliminar índices opcionales

-- 1. CORREGIR: Recrear el índice que eliminé incorrectamente (SÍ es FK)
CREATE INDEX IF NOT EXISTS idx_driver_profiles_license_state ON public.driver_profiles(license_state);

-- 2. ELIMINAR: Índices para FKs opcionales/auditoría (raramente consultadas)
DROP INDEX IF EXISTS idx_company_documents_archived_by;     -- FK auditoría
DROP INDEX IF EXISTS idx_equipment_documents_archived_by;   -- FK auditoría  
DROP INDEX IF EXISTS idx_load_documents_archived_by;        -- FK auditoría
DROP INDEX IF EXISTS idx_user_company_roles_delegated_by;   -- FK opcional
DROP INDEX IF EXISTS idx_loads_client_contact_id;           -- FK opcional
DROP INDEX IF EXISTS idx_loads_internal_dispatcher_id;      -- FK opcional
DROP INDEX IF EXISTS idx_security_audit_log_user_id;        -- FK auditoría

-- 3. ELIMINAR: Índices Geotab (funcionalidad externa opcional)
DROP INDEX IF EXISTS idx_geotab_vehicle_assignments_driver_id;
DROP INDEX IF EXISTS idx_geotab_vehicle_assignments_vehicle_id;

-- MANTENER: Los índices críticos para el sistema:
-- - payment_period_id, company_id, driver_user_id, expense_type_id
-- - payment_method_id, vehicle_id, paid_by, created_by
-- - city_id, state_id (búsquedas geográficas)

-- Eliminando 9 índices opcionales, manteniendo 12 críticos