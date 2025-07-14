-- Habilitar realtime para la tabla company_equipment
ALTER TABLE public.company_equipment REPLICA IDENTITY FULL;

-- Verificar si la tabla está en la publicación de realtime, si no, agregarla
DO $$
BEGIN
    -- Intenta agregar la tabla a la publicación de realtime
    -- Si ya está, no hará nada
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'company_equipment'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.company_equipment;
    END IF;
END $$;