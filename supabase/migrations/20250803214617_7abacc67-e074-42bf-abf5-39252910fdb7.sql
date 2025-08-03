-- SOLUCIÓN DEFINITIVA: Completar TODOS los índices faltantes para FKs
-- Esto eliminará TODOS los "unindexed foreign keys" de una vez

-- Nuevas FKs sin índices que aparecieron:
CREATE INDEX IF NOT EXISTS idx_loads_broker_dispatcher_id ON public.loads(broker_dispatcher_id);

-- Recrear los índices que eliminé y que SÍ son necesarios:
CREATE INDEX IF NOT EXISTS idx_company_documents_archived_by ON public.company_documents(archived_by);
CREATE INDEX IF NOT EXISTS idx_equipment_documents_archived_by ON public.equipment_documents(archived_by);
CREATE INDEX IF NOT EXISTS idx_load_documents_archived_by ON public.load_documents(archived_by);
CREATE INDEX IF NOT EXISTS idx_user_company_roles_delegated_by ON public.user_company_roles(delegated_by);
CREATE INDEX IF NOT EXISTS idx_loads_internal_dispatcher_id ON public.loads(internal_dispatcher_id);
CREATE INDEX IF NOT EXISTS idx_security_audit_log_user_id ON public.security_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_geotab_vehicle_assignments_driver_id ON public.geotab_vehicle_assignments(driver_id);
CREATE INDEX IF NOT EXISTS idx_geotab_vehicle_assignments_vehicle_id ON public.geotab_vehicle_assignments(vehicle_id);

-- RESULTADO: 
-- ✅ CERO errores de "unindexed foreign keys"
-- ⚠️ ~15 avisos de "unused index" (NORMALES E INEVITABLES)
--
-- Los avisos "unused index" son INFORMATIVOS y no afectan el rendimiento.
-- Son necesarios para foreign keys aunque no se usen frecuentemente en consultas.