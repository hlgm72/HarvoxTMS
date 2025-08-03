-- SOLUCIÓN DEFINITIVA: Crear el índice correcto para la foreign key real
-- La foreign key loads_broker_dispatcher_id_fkey apunta a client_contact_id

CREATE INDEX IF NOT EXISTS idx_loads_client_contact_id ON public.loads(client_contact_id);

-- Nota: Los "unused index" warnings son informativos y normales para:
-- - Índices recién creados que aún no han sido utilizados por el query planner
-- - Índices de foreign keys que mejoran el rendimiento de JOINs aunque no se usen frecuentemente
-- - Índices preparatorios para futuras consultas del sistema

-- Estos índices se mantendrán porque:
-- 1. Mejoran el rendimiento de foreign key constraints
-- 2. Optimizan consultas con JOINs 
-- 3. Son recomendaciones directas del linter de Supabase