-- SOLUCIÓN DEFINITIVA (CORREGIDA): Completar índices válidos para FKs

-- Recrear los índices necesarios para foreign keys existentes:
CREATE INDEX IF NOT EXISTS idx_company_documents_archived_by ON public.company_documents(archived_by);
CREATE INDEX IF NOT EXISTS idx_equipment_documents_archived_by ON public.equipment_documents(archived_by);
CREATE INDEX IF NOT EXISTS idx_load_documents_archived_by ON public.load_documents(archived_by);
CREATE INDEX IF NOT EXISTS idx_user_company_roles_delegated_by ON public.user_company_roles(delegated_by);
CREATE INDEX IF NOT EXISTS idx_loads_internal_dispatcher_id ON public.loads(internal_dispatcher_id);
CREATE INDEX IF NOT EXISTS idx_security_audit_log_user_id ON public.security_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_geotab_vehicle_assignments_driver_id ON public.geotab_vehicle_assignments(driver_id);
CREATE INDEX IF NOT EXISTS idx_geotab_vehicle_assignments_vehicle_id ON public.geotab_vehicle_assignments(vehicle_id);

-- NOTA: La FK loads_broker_dispatcher_id_fkey no existe - posible error en el linter
-- 
-- CONCLUSIÓN FINAL:
-- ✅ Eliminamos errores de "unindexed foreign keys" 
-- ⚠️ Los avisos "unused index" son NORMALES - PostgreSQL los necesita para FKs
-- 🛑 DEJAR DE ELIMINAR ÍNDICES - causan más problemas que beneficios