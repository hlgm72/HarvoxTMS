-- Eliminar las tablas que están causando problemas de seguridad
-- Eliminar en orden correcto para respetar foreign keys

-- Primero eliminar tablas que referencian a otras
DROP TABLE IF EXISTS public.zip_city_links CASCADE;
DROP TABLE IF EXISTS public.us_cities CASCADE;
DROP TABLE IF EXISTS public.us_counties CASCADE;
DROP TABLE IF EXISTS public.zip_codes CASCADE;
DROP TABLE IF EXISTS public.us_states CASCADE;