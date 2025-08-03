-- Solución definitiva: Revocar completamente el acceso al esquema cron 
-- para eliminar todos los warnings de políticas de acceso anónimo

-- Revocar acceso al esquema cron para todos los roles
REVOKE ALL ON SCHEMA cron FROM public;
REVOKE ALL ON SCHEMA cron FROM anon;
REVOKE ALL ON SCHEMA cron FROM authenticated;

-- Revocar usage del esquema cron 
REVOKE USAGE ON SCHEMA cron FROM public;
REVOKE USAGE ON SCHEMA cron FROM anon;
REVOKE USAGE ON SCHEMA cron FROM authenticated;

-- Revocar acceso a todas las tablas del esquema cron
REVOKE ALL ON ALL TABLES IN SCHEMA cron FROM public;
REVOKE ALL ON ALL TABLES IN SCHEMA cron FROM anon;
REVOKE ALL ON ALL TABLES IN SCHEMA cron FROM authenticated;

-- Revocar acceso a todas las secuencias del esquema cron
REVOKE ALL ON ALL SEQUENCES IN SCHEMA cron FROM public;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA cron FROM anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA cron FROM authenticated;

-- Revocar acceso a todas las funciones del esquema cron
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA cron FROM public;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA cron FROM anon;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA cron FROM authenticated;

-- Asegurar que solo service_role y postgres tengan acceso
-- (esto preserva la funcionalidad del cron pero elimina warnings)
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL ON ALL TABLES IN SCHEMA cron TO postgres;
GRANT ALL ON ALL SEQUENCES IN SCHEMA cron TO postgres;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA cron TO postgres;