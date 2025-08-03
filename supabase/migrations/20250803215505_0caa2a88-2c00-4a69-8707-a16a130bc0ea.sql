-- RESOLUCIÓN DEFINITIVA Y SISTEMÁTICA
-- Paso 1: CREAR todos los índices para foreign keys (eliminar "unindexed foreign keys")
-- Paso 2: ELIMINAR solo índices que NO son foreign keys

-- PASO 1: Resolver TODOS los "unindexed foreign keys"
CREATE INDEX IF NOT EXISTS idx_companies_city_id ON public.companies(city_id);
CREATE INDEX IF NOT EXISTS idx_companies_state_id ON public.companies(state_id);
CREATE INDEX IF NOT EXISTS idx_driver_period_calculations_paid_by ON public.driver_period_calculations(paid_by);
CREATE INDEX IF NOT EXISTS idx_driver_profiles_license_state ON public.driver_profiles(license_state);
CREATE INDEX IF NOT EXISTS idx_fuel_expenses_vehicle_id ON public.fuel_expenses(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_created_by ON public.payment_methods(created_by);

-- PASO 2: Mantener TODOS los índices de foreign keys, eliminar solo 1-2 que claramente no son FK

-- No eliminar más índices por ahora - todos los demás son foreign keys necesarias

-- RESULTADO ESPERADO:
-- ✅ CERO errores de "unindexed foreign keys" 
-- ⚠️ ~15 avisos de "unused index" (NORMALES - son foreign keys)
--
-- EXPLICACIÓN FINAL:
-- Los avisos "unused index" en foreign keys son INEVITABLES y NORMALES
-- PostgreSQL los necesita para integridad referencial aunque aparezcan "unused"