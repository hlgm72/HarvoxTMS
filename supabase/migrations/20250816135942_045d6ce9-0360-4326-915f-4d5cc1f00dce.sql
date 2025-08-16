-- =============================================================
-- OPTIMIZACIONES ADICIONALES PARA REALTIME PERFORMANCE
-- =============================================================

-- PROBLEMA CRÍTICO: realtime.list_changes está consumiendo recursos excesivos
-- SOLUCIÓN: Reducir carga en realtime y optimizar subscriptions

-- 1. Remover tablas innecesarias de realtime publication
-- Solo mantener las que realmente necesitan updates en tiempo real

-- Verificar y remover loads de realtime si no es crítico
-- (los loads no necesitan updates en tiempo real tan frecuentes)
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS public.loads;

-- Verificar y remover driver_period_calculations de realtime
-- (los cálculos de períodos no necesitan updates frecuentes)
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS public.driver_period_calculations;

-- 2. Optimizar REPLICA IDENTITY para mejor performance
-- Cambiar a DEFAULT en lugar de FULL para reducir overhead

ALTER TABLE public.geotab_vehicle_positions REPLICA IDENTITY DEFAULT;
ALTER TABLE public.company_equipment REPLICA IDENTITY DEFAULT;

-- 3. Crear índice especializado para realtime queries más eficiente
-- Índice HASH para vehicle_id (más rápido para equality checks)
CREATE INDEX IF NOT EXISTS idx_geotab_positions_vehicle_hash 
ON public.geotab_vehicle_positions USING HASH(vehicle_id);

-- 4. Índice para queries de equipment status optimizado
CREATE INDEX IF NOT EXISTS idx_equipment_status_active 
ON public.company_equipment(status, updated_at DESC) 
WHERE status = 'active';

-- 5. Vacuuming automático optimizado para tablas realtime
-- Esto ayudará con el rendimiento general de las consultas