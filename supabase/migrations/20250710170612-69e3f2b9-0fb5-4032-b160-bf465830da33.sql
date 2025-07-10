-- Migración para hacer el sistema de períodos más flexible

-- 1. Renombrar columnas en payment_periods para mayor claridad
ALTER TABLE public.payment_periods 
RENAME COLUMN week_start_date TO period_start_date;

ALTER TABLE public.payment_periods 
RENAME COLUMN week_end_date TO period_end_date;

-- 2. Agregar campos para identificar el tipo de período
ALTER TABLE public.payment_periods 
ADD COLUMN period_type TEXT DEFAULT 'regular', -- 'regular', 'special', 'bonus'
ADD COLUMN period_frequency TEXT; -- 'weekly', 'biweekly', 'monthly', 'custom'

-- 3. Agregar configuración de períodos de pago por compañía
ALTER TABLE public.companies 
ADD COLUMN default_payment_frequency TEXT DEFAULT 'weekly', -- 'weekly', 'biweekly', 'monthly'
ADD COLUMN payment_cycle_start_day INTEGER DEFAULT 1; -- 1=Monday, 2=Tuesday, etc.

-- 4. Actualizar los índices existentes con los nuevos nombres
DROP INDEX IF EXISTS idx_payment_periods_driver_date;
CREATE INDEX idx_payment_periods_driver_date ON public.payment_periods(driver_user_id, period_start_date);

-- 5. Crear índice para el nuevo campo de tipo de período
CREATE INDEX idx_payment_periods_type ON public.payment_periods(period_type);

-- 6. Actualizar datos existentes para que tengan el nuevo formato
UPDATE public.payment_periods 
SET period_frequency = 'weekly', period_type = 'regular' 
WHERE period_frequency IS NULL;