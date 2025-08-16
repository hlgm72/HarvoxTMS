-- =============================================================
-- OPTIMIZACIONES DE RENDIMIENTO CORREGIDAS (SIN FUNCIONES NOW())
-- =============================================================

-- PROBLEMA 1: realtime.list_changes en geotab_vehicle_positions (10MB tabla)
-- SOLUCIÓN: Índices optimizados para realtime performance

-- Índice para consultas por vehículo y tiempo (realtime)
CREATE INDEX IF NOT EXISTS idx_geotab_positions_vehicle_time 
ON public.geotab_vehicle_positions(vehicle_id, created_at DESC);

-- Índice temporal para consultas recientes
CREATE INDEX IF NOT EXISTS idx_geotab_positions_recent 
ON public.geotab_vehicle_positions(created_at DESC, vehicle_id);

-- PROBLEMA 2: user_company_roles queries complejos
-- SOLUCIÓN: Índices compuestos específicos

-- Índice para queries por role + company + active
CREATE INDEX IF NOT EXISTS idx_user_company_roles_role_company_active 
ON public.user_company_roles(role, company_id, is_active) 
WHERE is_active = true;

-- Índice para búsquedas por role específico
CREATE INDEX IF NOT EXISTS idx_user_company_roles_role_active 
ON public.user_company_roles(role, is_active, updated_at DESC) 
WHERE is_active = true;

-- PROBLEMA 3: Loads queries lentos en dashboards
-- SOLUCIÓN: Índices para queries más comunes

-- Índice para status + fecha (dashboards)
CREATE INDEX IF NOT EXISTS idx_loads_status_date 
ON public.loads(status, created_at DESC) 
WHERE status IS NOT NULL;

-- Índice compuesto para driver + status
CREATE INDEX IF NOT EXISTS idx_loads_driver_status_date 
ON public.loads(driver_user_id, status, created_at DESC) 
WHERE driver_user_id IS NOT NULL;

-- PROBLEMA 4: driver_period_calculations performance
-- SOLUCIÓN: Índice para payment queries

-- Índice para payment status + fecha
CREATE INDEX IF NOT EXISTS idx_driver_calc_payment_status 
ON public.driver_period_calculations(payment_status, updated_at DESC) 
WHERE payment_status IS NOT NULL;

-- Índice para company + payment status
CREATE INDEX IF NOT EXISTS idx_driver_calc_company_payment 
ON public.driver_period_calculations(company_payment_period_id, payment_status);

-- PROBLEMA 5: Optimización para queries WITH complejos
-- SOLUCIÓN: Índice para company + driver lookups

-- Índice específico para company + driver + fecha
CREATE INDEX IF NOT EXISTS idx_loads_company_driver_date 
ON public.loads(payment_period_id, driver_user_id, created_at DESC);