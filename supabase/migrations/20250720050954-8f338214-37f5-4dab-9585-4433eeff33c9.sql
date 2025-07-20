-- REESTRUCTURAR: Períodos por Empresa en lugar de por Conductor

-- 1. Crear nueva tabla para períodos por empresa
CREATE TABLE public.company_payment_periods (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  period_start_date DATE NOT NULL,
  period_end_date DATE NOT NULL,
  period_frequency TEXT NOT NULL, -- 'weekly', 'biweekly', 'monthly'
  period_type TEXT NOT NULL DEFAULT 'regular',
  status TEXT NOT NULL DEFAULT 'open', -- 'open', 'processing', 'closed', 'paid'
  is_locked BOOLEAN NOT NULL DEFAULT false,
  locked_at TIMESTAMP WITH TIME ZONE,
  locked_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Constraints
  UNIQUE(company_id, period_start_date, period_end_date),
  CHECK (period_end_date >= period_start_date)
);

-- 2. Crear tabla para cálculos de conductores dentro de cada período
CREATE TABLE public.driver_period_calculations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_payment_period_id UUID NOT NULL REFERENCES public.company_payment_periods(id) ON DELETE CASCADE,
  driver_user_id UUID NOT NULL,
  
  -- Totales calculados
  gross_earnings NUMERIC NOT NULL DEFAULT 0,
  total_deductions NUMERIC NOT NULL DEFAULT 0,
  other_income NUMERIC NOT NULL DEFAULT 0,
  total_income NUMERIC NOT NULL DEFAULT 0,
  net_payment NUMERIC NOT NULL DEFAULT 0,
  has_negative_balance BOOLEAN NOT NULL DEFAULT false,
  balance_alert_message TEXT,
  
  -- Metadata
  calculated_at TIMESTAMP WITH TIME ZONE,
  calculated_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Constraints
  UNIQUE(company_payment_period_id, driver_user_id)
);

-- 3. Crear índices para mejor rendimiento
CREATE INDEX idx_company_payment_periods_company_dates 
ON public.company_payment_periods(company_id, period_start_date, period_end_date);

CREATE INDEX idx_driver_period_calculations_period_driver 
ON public.driver_period_calculations(company_payment_period_id, driver_user_id);

-- 4. Agregar RLS policies
ALTER TABLE public.company_payment_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_period_calculations ENABLE ROW LEVEL SECURITY;

-- RLS para company_payment_periods
CREATE POLICY "Company payment periods access" 
ON public.company_payment_periods 
FOR ALL 
USING (
  (auth.role() = 'service_role'::text) OR 
  (
    (auth.role() = 'authenticated'::text) AND 
    (company_id IN (
      SELECT get_user_company_roles.company_id
      FROM get_user_company_roles(auth.uid()) get_user_company_roles(company_id, role)
    ))
  )
);

-- RLS para driver_period_calculations  
CREATE POLICY "Driver period calculations access" 
ON public.driver_period_calculations 
FOR ALL 
USING (
  (auth.role() = 'service_role'::text) OR 
  (
    (auth.role() = 'authenticated'::text) AND 
    (
      (auth.uid() = driver_user_id) OR 
      (company_payment_period_id IN (
        SELECT cpp.id 
        FROM public.company_payment_periods cpp
        WHERE cpp.company_id IN (
          SELECT get_user_company_roles.company_id
          FROM get_user_company_roles(auth.uid()) get_user_company_roles(company_id, role)
        )
      ))
    )
  )
);

-- 5. Crear función para obtener el período actual de una empresa
CREATE OR REPLACE FUNCTION public.get_company_current_payment_period(
  company_id_param UUID, 
  target_date DATE DEFAULT CURRENT_DATE
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  period_id UUID;
  company_settings RECORD;
BEGIN
  -- Obtener configuración de la empresa
  SELECT 
    default_payment_frequency,
    payment_cycle_start_day
  INTO company_settings
  FROM public.companies 
  WHERE id = company_id_param;
  
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  
  -- Buscar período existente
  SELECT cpp.id INTO period_id
  FROM public.company_payment_periods cpp
  WHERE cpp.company_id = company_id_param
  AND target_date BETWEEN cpp.period_start_date AND cpp.period_end_date
  AND cpp.status IN ('open', 'processing')
  LIMIT 1;
  
  -- Si no existe, generar períodos automáticamente
  IF period_id IS NULL THEN
    -- Generar períodos para un rango que incluya la fecha objetivo
    PERFORM public.generate_company_payment_periods(
      company_id_param,
      target_date - INTERVAL '30 days',
      target_date + INTERVAL '30 days'
    );
    
    -- Intentar encontrar el período nuevamente
    SELECT cpp.id INTO period_id
    FROM public.company_payment_periods cpp
    WHERE cpp.company_id = company_id_param
    AND target_date BETWEEN cpp.period_start_date AND cpp.period_end_date
    AND cpp.status IN ('open', 'processing')
    LIMIT 1;
  END IF;
  
  RETURN period_id;
END;
$$;