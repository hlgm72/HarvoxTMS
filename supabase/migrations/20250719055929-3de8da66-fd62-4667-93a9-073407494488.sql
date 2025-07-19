-- Agregar restricción única para load_number en la tabla loads
-- Esto previene que se guarden cargas con el mismo número

-- Primero verificar si ya existen duplicados
DO $$
DECLARE
    duplicate_count INTEGER;
BEGIN
    SELECT COUNT(*) 
    INTO duplicate_count
    FROM (
        SELECT load_number 
        FROM public.loads 
        GROUP BY load_number 
        HAVING COUNT(*) > 1
    ) duplicates;
    
    IF duplicate_count > 0 THEN
        RAISE NOTICE 'Se encontraron % números de carga duplicados. Se necesita limpiar antes de agregar la restricción.', duplicate_count;
    ELSE
        -- Agregar la restricción única si no hay duplicados
        ALTER TABLE public.loads 
        ADD CONSTRAINT loads_load_number_unique UNIQUE (load_number);
        
        RAISE NOTICE 'Restricción única agregada exitosamente para load_number';
    END IF;
END $$;