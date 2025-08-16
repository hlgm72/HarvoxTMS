-- Solucionar SOLO el foreign key sin índice: loads.broker_dispatcher_id
-- Primero verifico si la columna existe, luego creo el índice

DO $$
BEGIN
  -- Verificar si la tabla y columna existen
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'loads' 
    AND column_name = 'broker_dispatcher_id'
  ) THEN
    -- Crear el índice para la foreign key
    CREATE INDEX IF NOT EXISTS idx_loads_broker_dispatcher_id 
    ON public.loads(broker_dispatcher_id);
    
    RAISE NOTICE 'Índice idx_loads_broker_dispatcher_id creado exitosamente';
  ELSE
    RAISE NOTICE 'Columna broker_dispatcher_id no existe en la tabla loads';
  END IF;
END $$;