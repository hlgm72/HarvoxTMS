-- =============================================================
-- OPTIMIZACIONES ADICIONALES PARA REALTIME PERFORMANCE
-- =============================================================

-- PROBLEMA CRÍTICO: realtime.list_changes está consumiendo recursos excesivos
-- SOLUCIÓN: Reducir carga en realtime y optimizar subscriptions

-- 1. Remover tablas innecesarias de realtime publication
-- Solo mantener las que realmente necesitan updates en tiempo real

-- Verificar si las tablas están en la publication y removerlas
DO $$
BEGIN
  -- Remover loads de realtime (no es crítico para tiempo real)
  IF EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'loads') THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.loads;
  END IF;
  
  -- Remover driver_period_calculations de realtime (no necesita updates frecuentes)
  IF EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'driver_period_calculations') THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.driver_period_calculations;
  END IF;
END $$;

-- 2. Optimizar REPLICA IDENTITY para mejor performance
-- Cambiar a DEFAULT en lugar de FULL para reducir overhead
ALTER TABLE public.geotab_vehicle_positions REPLICA IDENTITY DEFAULT;
ALTER TABLE public.company_equipment REPLICA IDENTITY DEFAULT;

-- 3. Crear índices especializados para mejor performance
-- Índice HASH para vehicle_id (más rápido para equality checks)
CREATE INDEX IF NOT EXISTS idx_geotab_positions_vehicle_hash 
ON public.geotab_vehicle_positions USING HASH(vehicle_id);

-- 4. Índice para queries de equipment status optimizado
CREATE INDEX IF NOT EXISTS idx_equipment_status_active 
ON public.company_equipment(status, updated_at DESC) 
WHERE status = 'active';