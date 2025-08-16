-- =============================================================
-- OPTIMIZACIONES DE RENDIMIENTO PARA QUERIES PROBLEMÁTICOS
-- =============================================================

-- PROBLEMA 1: realtime.list_changes en geotab_vehicle_positions (10MB tabla)
-- SOLUCIÓN: Optimizar índices para realtime y limitar historical data

-- Índice optimizado para geotab_vehicle_positions realtime queries
CREATE INDEX IF NOT EXISTS idx_geotab_positions_realtime_optimized 
ON public.geotab_vehicle_positions(vehicle_id, created_at DESC) 
WHERE created_at > (NOW() - INTERVAL '7 days');

-- Índice para consultas de tiempo específico (para realtime performance)
CREATE INDEX IF NOT EXISTS idx_geotab_positions_timestamp 
ON public.geotab_vehicle_positions(created_at DESC, vehicle_id);

-- PROBLEMA 2: Queries complejos de user_company_roles están sobrecargados
-- SOLUCIÓN: Índice compuesto específico para queries más comunes

-- Índice para queries que filtran por role y company
CREATE INDEX IF NOT EXISTS idx_user_company_roles_role_company_active 
ON public.user_company_roles(role, company_id, is_active) 
WHERE is_active = true;

-- PROBLEMA 3: Loads queries con múltiples JOINs
-- SOLUCIÓN: Índices optimizados para los campos más consultados

-- Índice para status queries (muy común en dashboards)
CREATE INDEX IF NOT EXISTS idx_loads_status_date 
ON public.loads(status, created_at DESC) 
WHERE status IS NOT NULL;

-- Índice para driver y fecha (común en reportes)
CREATE INDEX IF NOT EXISTS idx_loads_driver_status_date 
ON public.loads(driver_user_id, status, created_at DESC);

-- PROBLEMA 4: driver_period_calculations es consultado frecuentemente
-- SOLUCIÓN: Índice para queries de payment status

-- Índice para payment status queries
CREATE INDEX IF NOT EXISTS idx_driver_calc_payment_status 
ON public.driver_period_calculations(payment_status, calculated_at DESC);

-- PROBLEMA 5: Optimización para queries de profiles complejos
-- SOLUCIÓN: Verificar si existe tabla profiles y optimizar

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
    CREATE INDEX IF NOT EXISTS idx_profiles_updated_recent 
    ON public.profiles(updated_at DESC) 
    WHERE updated_at > (NOW() - INTERVAL '30 days');
  END IF;
END $$;