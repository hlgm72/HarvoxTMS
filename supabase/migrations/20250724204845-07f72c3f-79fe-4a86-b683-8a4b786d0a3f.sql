-- Crear esquema dedicado para extensiones si no existe
CREATE SCHEMA IF NOT EXISTS extensions;

-- Mover la extensión pg_net del esquema public al esquema extensions
-- Primero eliminar de public
DROP EXTENSION IF EXISTS pg_net;

-- Reinstalar en el esquema extensions
CREATE EXTENSION IF NOT EXISTS pg_net 
WITH SCHEMA extensions;

-- Otorgar permisos necesarios al rol de servicio
GRANT USAGE ON SCHEMA extensions TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA extensions TO service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA extensions TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA extensions TO service_role;

-- Asegurar que funciones relacionadas usen el esquema correcto
ALTER DEFAULT PRIVILEGES IN SCHEMA extensions 
GRANT ALL ON TABLES TO service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA extensions 
GRANT ALL ON ROUTINES TO service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA extensions 
GRANT ALL ON SEQUENCES TO service_role;