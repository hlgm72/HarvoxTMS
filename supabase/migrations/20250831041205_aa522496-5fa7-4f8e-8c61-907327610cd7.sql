-- Buscar y listar todas las funciones que contienen referencias a tablas de períodos de pago
-- para identificar cualquier función que aún referencie incorrectamente "payment_periods"

DO $$
DECLARE
    func_record RECORD;
    line_text TEXT;
    line_number INTEGER;
BEGIN
    RAISE NOTICE '=== BÚSQUEDA DE FUNCIONES CON REFERENCIAS A PAYMENT_PERIODS ===';
    
    -- Buscar funciones que contienen "payment_periods" (sin company_ prefix)
    FOR func_record IN 
        SELECT 
            n.nspname as schema_name,
            p.proname as function_name,
            pg_get_functiondef(p.oid) as function_definition
        FROM pg_proc p
        LEFT JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
        AND (
            pg_get_functiondef(p.oid) LIKE '%payment_periods%'
            AND pg_get_functiondef(p.oid) NOT LIKE '%company_payment_periods%'
        )
    LOOP
        RAISE NOTICE 'ENCONTRADA: %.% contiene referencias incorrectas', func_record.schema_name, func_record.function_name;
        
        -- Mostrar las líneas problemáticas
        line_number := 1;
        FOREACH line_text IN ARRAY string_to_array(func_record.function_definition, E'\n')
        LOOP
            IF line_text LIKE '%payment_periods%' AND line_text NOT LIKE '%company_payment_periods%' THEN
                RAISE NOTICE '  Línea %: %', line_number, line_text;
            END IF;
            line_number := line_number + 1;
        END LOOP;
        
    END LOOP;
    
    RAISE NOTICE '=== FIN DE BÚSQUEDA ===';
END $$;