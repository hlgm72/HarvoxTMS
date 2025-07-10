-- Agregar configuración de períodos de pago a las compañías
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS default_payment_frequency TEXT DEFAULT 'weekly', -- 'weekly', 'biweekly', 'monthly'
ADD COLUMN IF NOT EXISTS payment_cycle_start_day INTEGER DEFAULT 1; -- 1=Monday, 2=Tuesday, etc.

-- Crear índice para el tipo de período si no existe
CREATE INDEX IF NOT EXISTS idx_payment_periods_type ON public.payment_periods(period_type);

-- Asegurar que los datos existentes tengan los valores correctos
UPDATE public.payment_periods 
SET period_frequency = 'weekly', period_type = 'regular' 
WHERE period_frequency IS NULL OR period_type IS NULL;