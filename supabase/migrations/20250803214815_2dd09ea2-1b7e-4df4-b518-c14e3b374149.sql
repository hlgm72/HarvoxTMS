-- SOLUCIÓN DEFINITIVA: Crear el índice correcto para la FK mal nombrada
-- El linter reporta "loads_broker_dispatcher_id_fkey" pero la FK real apunta a "client_contact_id"

CREATE INDEX IF NOT EXISTS idx_loads_client_contact_id ON public.loads(client_contact_id);

-- EXPLICACIÓN DEL PROBLEMA:
-- El nombre de la FK es confuso: "loads_broker_dispatcher_id_fkey" 
-- Pero la FK real apunta a la columna "client_contact_id"
-- El linter de Supabase reportó el nombre de la FK, no el nombre de la columna
--
-- RESULTADO ESPERADO:
-- ✅ CERO errores de "unindexed foreign keys" 
-- ⚠️ ~20 avisos de "unused index" → NORMALES para foreign keys

-- CONCLUSIÓN: 
-- Los avisos "unused index" SON INEVITABLES en cualquier BD real con foreign keys
-- Son informativos, NO afectan el rendimiento