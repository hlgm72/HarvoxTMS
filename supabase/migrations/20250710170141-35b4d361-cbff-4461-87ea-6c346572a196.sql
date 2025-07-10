
-- Sistema especializado de gestión de gastos de combustible
-- Tabla para registros detallados de combustible

CREATE TABLE public.fuel_expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  payment_period_id UUID NOT NULL REFERENCES public.payment_periods(id) ON DELETE CASCADE,
  driver_user_id UUID NOT NULL,
  
  -- Detalles de la transacción de combustible
  transaction_date TIMESTAMP WITH TIME ZONE NOT NULL,
  fuel_card_number TEXT, -- Últimos 4 dígitos de la tarjeta
  station_name TEXT,
  station_address TEXT,
  
  -- Detalles del combustible
  fuel_type TEXT NOT NULL DEFAULT 'diesel', -- 'diesel', 'gasoline', 'def'
  gallons_purchased DECIMAL(8,3) NOT NULL,
  price_per_gallon DECIMAL(6,3) NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  
  -- Información del vehículo
  vehicle_id UUID REFERENCES public.vehicles(id),
  odometer_reading INTEGER, -- Millaje al momento del tanqueo
  
  -- Estado y procesamiento
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'disputed', 'applied'
  receipt_url TEXT, -- URL del recibo escaneado
  
  -- Validación y auditoría
  is_verified BOOLEAN NOT NULL DEFAULT false,
  verified_by UUID,
  verified_at TIMESTAMP WITH TIME ZONE,
  
  -- Notas y observaciones
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.fuel_expenses ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para fuel_expenses
CREATE POLICY "Users can view their own fuel expenses" ON public.fuel_expenses FOR SELECT USING (auth.uid() = driver_user_id);

CREATE POLICY "Company members can view company fuel expenses" ON public.fuel_expenses FOR SELECT USING (
  driver_user_id IN (
    SELECT ucr.user_id FROM public.user_company_roles ucr 
    WHERE ucr.company_id IN (
      SELECT company_id FROM public.user_company_roles 
      WHERE user_id = auth.uid() AND is_active = true
    ) AND ucr.is_active = true
  )
);

CREATE POLICY "Company members can manage fuel expenses" ON public.fuel_expenses FOR ALL USING (
  driver_user_id IN (
    SELECT ucr.user_id FROM public.user_company_roles ucr 
    WHERE ucr.company_id IN (
      SELECT company_id FROM public.user_company_roles 
      WHERE user_id = auth.uid() AND is_active = true
    ) AND ucr.is_active = true
  )
);

CREATE POLICY "Service role can manage fuel expenses" ON public.fuel_expenses FOR ALL USING (true) WITH CHECK (true);

-- Índices para mejor performance
CREATE INDEX idx_fuel_expenses_driver_user ON public.fuel_expenses(driver_user_id);
CREATE INDEX idx_fuel_expenses_payment_period ON public.fuel_expenses(payment_period_id);
CREATE INDEX idx_fuel_expenses_transaction_date ON public.fuel_expenses(transaction_date);
CREATE INDEX idx_fuel_expenses_status ON public.fuel_expenses(status);
CREATE INDEX idx_fuel_expenses_vehicle ON public.fuel_expenses(vehicle_id);

-- Trigger para actualizar timestamps
CREATE TRIGGER update_fuel_expenses_updated_at BEFORE UPDATE ON public.fuel_expenses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Tabla para límites y alertas de combustible por conductor
CREATE TABLE public.fuel_limits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  driver_user_id UUID NOT NULL,
  
  -- Límites por período
  weekly_gallon_limit DECIMAL(8,2),
  weekly_dollar_limit DECIMAL(10,2),
  daily_gallon_limit DECIMAL(8,2),
  daily_dollar_limit DECIMAL(10,2),
  
  -- Alertas automáticas
  alert_at_percentage INTEGER DEFAULT 80, -- Alerta al 80% del límite
  
  -- Validez del límite
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_until DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  
  -- Auditoría
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS para fuel_limits
ALTER TABLE public.fuel_limits ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para fuel_limits
CREATE POLICY "Users can view their own fuel limits" ON public.fuel_limits FOR SELECT USING (auth.uid() = driver_user_id);

CREATE POLICY "Company members can view company fuel limits" ON public.fuel_limits FOR SELECT USING (
  driver_user_id IN (
    SELECT ucr.user_id FROM public.user_company_roles ucr 
    WHERE ucr.company_id IN (
      SELECT company_id FROM public.user_company_roles 
      WHERE user_id = auth.uid() AND is_active = true
    ) AND ucr.is_active = true
  )
);

CREATE POLICY "Company members can manage fuel limits" ON public.fuel_limits FOR ALL USING (
  driver_user_id IN (
    SELECT ucr.user_id FROM public.user_company_roles ucr 
    WHERE ucr.company_id IN (
      SELECT company_id FROM public.user_company_roles 
      WHERE user_id = auth.uid() AND is_active = true
    ) AND ucr.is_active = true
  )
);

CREATE POLICY "Service role can manage fuel limits" ON public.fuel_limits FOR ALL USING (true) WITH CHECK (true);

-- Índices para fuel_limits
CREATE INDEX idx_fuel_limits_driver ON public.fuel_limits(driver_user_id);
CREATE INDEX idx_fuel_limits_active ON public.fuel_limits(is_active) WHERE is_active = true;

-- Trigger para fuel_limits
CREATE TRIGGER update_fuel_limits_updated_at BEFORE UPDATE ON public.fuel_limits FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Función para calcular el resumen de combustible por período
CREATE OR REPLACE FUNCTION public.calculate_fuel_summary_for_period(period_id UUID)
RETURNS TABLE (
  total_gallons DECIMAL(10,3),
  total_amount DECIMAL(12,2),
  average_price_per_gallon DECIMAL(8,3),
  transaction_count INTEGER,
  pending_amount DECIMAL(12,2),
  approved_amount DECIMAL(12,2)
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(fe.gallons_purchased), 0)::DECIMAL(10,3) as total_gallons,
    COALESCE(SUM(fe.total_amount), 0)::DECIMAL(12,2) as total_amount,
    CASE 
      WHEN SUM(fe.gallons_purchased) > 0 
      THEN (SUM(fe.total_amount) / SUM(fe.gallons_purchased))::DECIMAL(8,3)
      ELSE 0::DECIMAL(8,3)
    END as average_price_per_gallon,
    COUNT(*)::INTEGER as transaction_count,
    COALESCE(SUM(CASE WHEN fe.status = 'pending' THEN fe.total_amount ELSE 0 END), 0)::DECIMAL(12,2) as pending_amount,
    COALESCE(SUM(CASE WHEN fe.status = 'approved' THEN fe.total_amount ELSE 0 END), 0)::DECIMAL(12,2) as approved_amount
  FROM public.fuel_expenses fe
  WHERE fe.payment_period_id = period_id;
END;
$$;
