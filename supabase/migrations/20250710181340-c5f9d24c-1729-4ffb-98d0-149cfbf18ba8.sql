-- Tabla para métodos de pago personalizados por compañía
CREATE TABLE public.payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- e.g., "Banco Popular", "PayPal Business", "Wells Fargo"
  method_type TEXT NOT NULL DEFAULT 'manual', -- 'stripe', 'manual', 'bank_transfer', 'digital_wallet'
  description TEXT,
  requires_reference BOOLEAN DEFAULT true, -- Si requiere número de referencia
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para payment_methods
CREATE POLICY "Company members can view payment methods" 
ON public.payment_methods 
FOR SELECT 
USING (
  company_id IN (
    SELECT ucr.company_id 
    FROM user_company_roles ucr 
    WHERE ucr.user_id = auth.uid() AND ucr.is_active = true
  )
);

CREATE POLICY "Company owners can manage payment methods" 
ON public.payment_methods 
FOR ALL 
USING (
  company_id IN (
    SELECT ucr.company_id 
    FROM user_company_roles ucr 
    WHERE ucr.user_id = auth.uid() 
    AND ucr.role IN ('company_owner', 'senior_dispatcher')
    AND ucr.is_active = true
  )
);

CREATE POLICY "Service role can manage payment methods" 
ON public.payment_methods 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Tabla para reportes de pagos
CREATE TABLE public.payment_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_period_id UUID NOT NULL REFERENCES payment_periods(id) ON DELETE CASCADE,
  payment_method_id UUID NOT NULL REFERENCES payment_methods(id),
  amount DECIMAL(12,2) NOT NULL,
  reference_number TEXT, -- Número de confirmación/referencia
  transaction_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT,
  attachments JSONB, -- URLs de comprobantes/screenshots
  reported_by UUID NOT NULL REFERENCES auth.users(id),
  reported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  verified_by UUID REFERENCES auth.users(id),
  verified_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'verified', 'rejected'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payment_reports ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para payment_reports
CREATE POLICY "Company members can view payment reports" 
ON public.payment_reports 
FOR SELECT 
USING (
  payment_period_id IN (
    SELECT pp.id 
    FROM payment_periods pp
    JOIN user_company_roles ucr ON pp.driver_user_id = ucr.user_id
    WHERE ucr.company_id IN (
      SELECT user_company_roles.company_id 
      FROM user_company_roles 
      WHERE user_company_roles.user_id = auth.uid() AND user_company_roles.is_active = true
    )
    AND ucr.is_active = true
  )
);

CREATE POLICY "Company members can manage payment reports" 
ON public.payment_reports 
FOR ALL 
USING (
  payment_period_id IN (
    SELECT pp.id 
    FROM payment_periods pp
    JOIN user_company_roles ucr ON pp.driver_user_id = ucr.user_id
    WHERE ucr.company_id IN (
      SELECT user_company_roles.company_id 
      FROM user_company_roles 
      WHERE user_company_roles.user_id = auth.uid() AND user_company_roles.is_active = true
    )
    AND ucr.is_active = true
  )
  AND NOT is_period_locked(payment_period_id)
);

CREATE POLICY "Service role can manage payment reports" 
ON public.payment_reports 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Función para reportar pago y bloquear período
CREATE OR REPLACE FUNCTION public.report_payment_and_lock(
  period_id UUID,
  method_id UUID, 
  amount_paid DECIMAL,
  reference_num TEXT DEFAULT NULL,
  payment_notes TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  period_record RECORD;
  method_record RECORD;
  report_id UUID;
BEGIN
  -- Verificar período
  SELECT * INTO period_record FROM public.payment_periods WHERE id = period_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Período no encontrado');
  END IF;
  
  IF period_record.is_locked THEN
    RETURN jsonb_build_object('success', false, 'message', 'El período ya está bloqueado');
  END IF;
  
  -- Verificar método de pago
  SELECT * INTO method_record FROM public.payment_methods WHERE id = method_id AND is_active = true;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Método de pago no válido');
  END IF;
  
  -- Verificar referencia si es requerida
  IF method_record.requires_reference AND (reference_num IS NULL OR reference_num = '') THEN
    RETURN jsonb_build_object('success', false, 'message', 'Este método de pago requiere número de referencia');
  END IF;
  
  -- Crear reporte de pago
  INSERT INTO public.payment_reports (
    payment_period_id, payment_method_id, amount, reference_number, 
    notes, reported_by, status
  ) VALUES (
    period_id, method_id, amount_paid, reference_num, 
    payment_notes, auth.uid(), 'verified'
  ) RETURNING id INTO report_id;
  
  -- Bloquear período
  UPDATE public.payment_periods 
  SET 
    is_locked = true,
    locked_at = now(),
    locked_by = auth.uid(),
    status = 'paid',
    payment_method = method_record.name,
    payment_reference = reference_num
  WHERE id = period_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Pago reportado y período bloqueado exitosamente',
    'report_id', report_id,
    'period_id', period_id
  );
END;
$$;

-- Insertar métodos de pago por defecto
INSERT INTO public.payment_methods (company_id, name, method_type, description, requires_reference) 
SELECT 
  c.id as company_id,
  'Stripe Connect' as name,
  'stripe' as method_type,
  'Transferencias automáticas via Stripe' as description,
  true as requires_reference
FROM public.companies c;

INSERT INTO public.payment_methods (company_id, name, method_type, description, requires_reference) 
SELECT 
  c.id as company_id,
  'Zelle' as name,
  'digital_wallet' as method_type,
  'Transferencias Zelle' as description,
  true as requires_reference
FROM public.companies c;

INSERT INTO public.payment_methods (company_id, name, method_type, description, requires_reference) 
SELECT 
  c.id as company_id,
  'Transferencia Bancaria' as name,
  'bank_transfer' as method_type,
  'Transferencias bancarias directas' as description,
  true as requires_reference
FROM public.companies c;