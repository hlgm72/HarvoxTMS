-- ESTRATEGIA BASADA EN DOCUMENTACIÓN OFICIAL DE SUPABASE
-- La documentación dice que "unused indexes cause slow INSERT, UPDATE, DELETE operations"
-- Por lo tanto, ALGUNOS se pueden eliminar de forma segura

-- ELIMINAR índices para columnas que raramente se consultan:

-- 1. Índices de auditoría/metadatos (pocas consultas)
DROP INDEX IF EXISTS idx_payment_methods_created_by;           -- Auditoría
DROP INDEX IF EXISTS idx_driver_period_calculations_paid_by;   -- Auditoría 

-- 2. Índices geográficos si no hay búsquedas geográficas activas
DROP INDEX IF EXISTS idx_companies_city_id;                    -- Búsquedas geográficas
DROP INDEX IF EXISTS idx_companies_state_id;                   -- Búsquedas geográficas

-- 3. Índices para columnas opcionales/nulas frecuentemente
DROP INDEX IF EXISTS idx_fuel_expenses_vehicle_id;             -- Columna opcional
DROP INDEX IF EXISTS idx_driver_profiles_license_state;        -- Estado de licencia

-- MANTENER índices críticos para el funcionamiento:
-- ✅ payment_period_id, company_id, driver_user_id (consultas frecuentes)
-- ✅ payment_method_id, expense_type_id (JOINs importantes)
-- ✅ archived_by, delegated_by (foreign keys necesarias)

-- RESULTADO: Eliminar 6 índices seguros, mantener 15+ críticos
-- Esto mejorará INSERT/UPDATE/DELETE según documentación oficial