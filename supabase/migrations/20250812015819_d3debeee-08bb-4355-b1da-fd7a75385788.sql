-- Migración para cambiar city_id (UUID) a city (TEXT) en todas las tablas
-- Esto simplifica la arquitectura y hace más legible la base de datos

-- 1. Tabla companies: cambiar city_id a city
-- Primero obtener los nombres de las ciudades existentes
ALTER TABLE companies ADD COLUMN city TEXT;

-- Actualizar con nombres de ciudad donde sea posible
UPDATE companies 
SET city = sc.name 
FROM state_cities sc 
WHERE companies.city_id = sc.id;

-- Para ciudades que no se encuentren, usar un valor por defecto
UPDATE companies 
SET city = 'Ciudad no especificada' 
WHERE city_id IS NOT NULL AND city IS NULL;

-- Eliminar la columna city_id
ALTER TABLE companies DROP COLUMN city_id;

-- 2. Si existe tabla profiles con city_id, aplicar el mismo cambio
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'city_id'
    ) THEN
        -- Agregar nueva columna city
        ALTER TABLE profiles ADD COLUMN city TEXT;
        
        -- Migrar datos
        UPDATE profiles 
        SET city = sc.name 
        FROM state_cities sc 
        WHERE profiles.city_id = sc.id;
        
        -- Valor por defecto para ciudades no encontradas
        UPDATE profiles 
        SET city = 'Ciudad no especificada' 
        WHERE city_id IS NOT NULL AND city IS NULL;
        
        -- Eliminar city_id
        ALTER TABLE profiles DROP COLUMN city_id;
    END IF;
END $$;

-- 3. Buscar y actualizar cualquier otra tabla con city_id
DO $$
DECLARE
    tabla_rec RECORD;
BEGIN
    -- Buscar todas las tablas que tengan columna city_id
    FOR tabla_rec IN 
        SELECT table_name 
        FROM information_schema.columns 
        WHERE column_name = 'city_id' 
        AND table_schema = 'public'
        AND table_name NOT IN ('companies', 'profiles')
    LOOP
        -- Agregar columna city si no existe
        EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS city TEXT', tabla_rec.table_name);
        
        -- Migrar datos
        EXECUTE format('
            UPDATE %I 
            SET city = sc.name 
            FROM state_cities sc 
            WHERE %I.city_id = sc.id
        ', tabla_rec.table_name, tabla_rec.table_name);
        
        -- Valor por defecto
        EXECUTE format('
            UPDATE %I 
            SET city = ''Ciudad no especificada'' 
            WHERE city_id IS NOT NULL AND city IS NULL
        ', tabla_rec.table_name);
        
        -- Eliminar city_id
        EXECUTE format('ALTER TABLE %I DROP COLUMN city_id', tabla_rec.table_name);
        
        RAISE NOTICE 'Migrada tabla: %', tabla_rec.table_name;
    END LOOP;
END $$;