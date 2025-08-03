-- SOLUCIÓN DEFINITIVA: Crear índices faltantes SIN tocar los "unused"
-- Los "unused index" son solo informativos, no afectan rendimiento

-- Crear índices para las 4 foreign keys sin índice
CREATE INDEX IF NOT EXISTS idx_fuel_expenses_driver_user_id ON public.fuel_expenses(driver_user_id);
CREATE INDEX IF NOT EXISTS idx_loads_internal_dispatcher_id ON public.loads(internal_dispatcher_id);  
CREATE INDEX IF NOT EXISTS idx_loads_payment_period_id ON public.loads(payment_period_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_company_id ON public.payment_methods(company_id);

-- NOTA IMPORTANTE: 
-- Los índices "unused" se mantienen porque:
-- 1. Mejoran rendimiento de foreign keys aunque no se usen frecuentemente
-- 2. Son preparativos para futuras consultas
-- 3. Eliminarlos crearía un ciclo infinito de crear/eliminar
-- 4. Solo son advertencias informativas nivel INFO, no errores