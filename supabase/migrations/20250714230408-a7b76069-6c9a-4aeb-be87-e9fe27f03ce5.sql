-- Optimización de performance para user_company_roles
-- Crear índices compuestos para mejorar performance de consultas frecuentes

-- Índice para consultas por user_id + is_active (usado en líneas 215-220)
CREATE INDEX IF NOT EXISTS idx_user_company_roles_user_active 
ON public.user_company_roles (user_id, is_active) 
WHERE is_active = true;

-- Índice para consultas por company_id + is_active (usado en líneas 228-232)  
CREATE INDEX IF NOT EXISTS idx_user_company_roles_company_active 
ON public.user_company_roles (company_id, is_active)
WHERE is_active = true;

-- Índice compuesto para payment_periods con rango de fechas (usado frecuentemente)
CREATE INDEX IF NOT EXISTS idx_payment_periods_driver_dates 
ON public.payment_periods (driver_user_id, period_start_date, period_end_date);

-- Índice para loads por driver y period (consulta principal)
CREATE INDEX IF NOT EXISTS idx_loads_driver_period_created 
ON public.loads (driver_user_id, payment_period_id, created_at DESC);

-- Análisis de las tablas para que PostgreSQL tenga estadísticas actualizadas
ANALYZE public.user_company_roles;
ANALYZE public.payment_periods;  
ANALYZE public.loads;

-- Comentarios para documentar la optimización
COMMENT ON INDEX idx_user_company_roles_user_active IS 'Optimiza consultas de compañía por usuario activo';
COMMENT ON INDEX idx_user_company_roles_company_active IS 'Optimiza consultas de usuarios por compañía activa';
COMMENT ON INDEX idx_payment_periods_driver_dates IS 'Optimiza búsqueda de períodos por rango de fechas';
COMMENT ON INDEX idx_loads_driver_period_created IS 'Optimiza consulta principal de cargas con ordenamiento';