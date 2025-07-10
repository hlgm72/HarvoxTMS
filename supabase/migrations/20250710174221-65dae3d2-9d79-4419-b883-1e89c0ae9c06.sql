-- Tabla para otros ingresos de los conductores
-- Bonos, reembolsos, ajustes positivos, etc.

CREATE TABLE public.other_income (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  payment_period_id UUID NOT NULL REFERENCES public.payment_periods(id) ON DELETE CASCADE,
  driver_user_id UUID NOT NULL,
  
  -- Detalles del ingreso
  income_type TEXT NOT NULL, -- 'bonus', 'reimbursement', 'adjustment', 'referral', 'safety_bonus'
  description TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL CHECK (amount >= 0),
  
  -- Fechas y procesamiento
  income_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'applied', 'rejected'
  
  -- Documentación y aprobación
  receipt_url TEXT,
  reference_number TEXT, -- Número de referencia o documento
  notes TEXT,
  
  -- Auditoría y aprobación
  approved_by UUID,
  approved_at TIMESTAMP WITH TIME ZONE,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.other_income ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para other_income
CREATE POLICY "Users can view their own other income" ON public.other_income FOR SELECT USING (auth.uid() = driver_user_id);

CREATE POLICY "Company members can view company other income" ON public.other_income FOR SELECT USING (
  driver_user_id IN (
    SELECT ucr.user_id FROM public.user_company_roles ucr 
    WHERE ucr.company_id IN (
      SELECT company_id FROM public.user_company_roles 
      WHERE user_id = auth.uid() AND is_active = true
    ) AND ucr.is_active = true
  )
);

CREATE POLICY "Company members can manage other income" ON public.other_income FOR ALL USING (
  driver_user_id IN (
    SELECT ucr.user_id FROM public.user_company_roles ucr 
    WHERE ucr.company_id IN (
      SELECT company_id FROM public.user_company_roles 
      WHERE user_id = auth.uid() AND is_active = true
    ) AND ucr.is_active = true
  )
);

CREATE POLICY "Service role can manage other income" ON public.other_income FOR ALL USING (true) WITH CHECK (true);

-- Índices para mejor performance
CREATE INDEX idx_other_income_driver_user ON public.other_income(driver_user_id);
CREATE INDEX idx_other_income_payment_period ON public.other_income(payment_period_id);
CREATE INDEX idx_other_income_date ON public.other_income(income_date);
CREATE INDEX idx_other_income_status ON public.other_income(status);
CREATE INDEX idx_other_income_type ON public.other_income(income_type);

-- Trigger para actualizar timestamps
CREATE TRIGGER update_other_income_updated_at BEFORE UPDATE ON public.other_income FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();