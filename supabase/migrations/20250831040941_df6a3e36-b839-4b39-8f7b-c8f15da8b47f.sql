-- Buscar y corregir TODAS las funciones que referencien la tabla incorrecta "payment_periods"
-- La tabla correcta es "company_payment_periods"

-- Primero, busquemos todas las funciones que puedan tener este problema
DO $$
DECLARE
    func_record RECORD;
    func_source TEXT;
    corrected_source TEXT;
BEGIN
    -- Buscar todas las funciones que contengan "payment_periods"
    FOR func_record IN 
        SELECT 
            n.nspname as schema_name,
            p.proname as function_name,
            pg_get_functiondef(p.oid) as function_definition
        FROM pg_proc p
        LEFT JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
        AND pg_get_functiondef(p.oid) LIKE '%public.payment_periods%'
    LOOP
        RAISE NOTICE 'Found function with payment_periods reference: %.%', func_record.schema_name, func_record.function_name;
        
        -- Corregir la definición de la función
        corrected_source := replace(func_record.function_definition, 'public.payment_periods', 'public.company_payment_periods');
        
        -- Ejecutar la corrección
        BEGIN
            EXECUTE corrected_source;
            RAISE NOTICE 'Corrected function: %.%', func_record.schema_name, func_record.function_name;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Error correcting function %.%: %', func_record.schema_name, func_record.function_name, SQLERRM;
        END;
        
    END LOOP;
END $$;

-- También corregir específicamente cualquier función que tenga referencias sin el prefijo "public."
DO $$
DECLARE
    func_record RECORD;
    func_source TEXT;
    corrected_source TEXT;
BEGIN
    -- Buscar todas las funciones que contengan "payment_periods" sin prefijo
    FOR func_record IN 
        SELECT 
            n.nspname as schema_name,
            p.proname as function_name,
            pg_get_functiondef(p.oid) as function_definition
        FROM pg_proc p
        LEFT JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
        AND (
            pg_get_functiondef(p.oid) LIKE '%FROM payment_periods%'
            OR pg_get_functiondef(p.oid) LIKE '%JOIN payment_periods%'
            OR pg_get_functiondef(p.oid) LIKE '%INTO payment_periods%'
            OR pg_get_functiondef(p.oid) LIKE '%UPDATE payment_periods%'
            OR pg_get_functiondef(p.oid) LIKE '%DELETE FROM payment_periods%'
            OR pg_get_functiondef(p.oid) LIKE '%INSERT INTO payment_periods%'
        )
    LOOP
        RAISE NOTICE 'Found function with unqualified payment_periods reference: %.%', func_record.schema_name, func_record.function_name;
        
        -- Corregir múltiples patrones
        corrected_source := func_record.function_definition;
        corrected_source := replace(corrected_source, ' payment_periods ', ' company_payment_periods ');
        corrected_source := replace(corrected_source, ' payment_periods.', ' company_payment_periods.');
        corrected_source := replace(corrected_source, 'FROM payment_periods', 'FROM company_payment_periods');
        corrected_source := replace(corrected_source, 'JOIN payment_periods', 'JOIN company_payment_periods');
        corrected_source := replace(corrected_source, 'INTO payment_periods', 'INTO company_payment_periods');
        corrected_source := replace(corrected_source, 'UPDATE payment_periods', 'UPDATE company_payment_periods');
        corrected_source := replace(corrected_source, 'DELETE FROM payment_periods', 'DELETE FROM company_payment_periods');
        corrected_source := replace(corrected_source, 'INSERT INTO payment_periods', 'INSERT INTO company_payment_periods');
        
        -- Solo ejecutar si hubo cambios
        IF corrected_source != func_record.function_definition THEN
            BEGIN
                EXECUTE corrected_source;
                RAISE NOTICE 'Corrected unqualified references in function: %.%', func_record.schema_name, func_record.function_name;
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Error correcting function %.%: %', func_record.schema_name, func_record.function_name, SQLERRM;
            END;
        END IF;
        
    END LOOP;
END $$;