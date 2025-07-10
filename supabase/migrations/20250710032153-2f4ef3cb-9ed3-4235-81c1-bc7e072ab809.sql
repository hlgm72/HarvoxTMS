-- Sistema de Gestión de Pagos y Gastos de Conductores
-- Creado basado en las conversaciones de análisis de requerimientos

-- Tabla de tipos de gastos base para categorización
CREATE TABLE public.expense_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT, -- 'fuel', 'insurance', 'maintenance', 'communication', 'other'
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabla de plantillas para gastos recurrentes
CREATE TABLE public.recurring_expense_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  expense_type_id UUID NOT NULL REFERENCES public.expense_types(id),
  driver_user_id UUID NOT NULL, -- Referencias al user_id del conductor
  
  -- Configuración de recurrencia
  frequency TEXT NOT NULL, -- 'weekly', 'monthly', 'biweekly'
  amount DECIMAL(10,2) NOT NULL,
  
  -- Para gastos mensuales: en qué semana del mes aplicar
  month_week INTEGER, -- 1=primera semana, 2=segunda, etc. Solo para frequency='monthly'
  
  -- Fechas de validez de la plantilla
  start_date DATE NOT NULL,
  end_date DATE, -- NULL = indefinido
  
  -- Estado
  is_active BOOLEAN NOT NULL DEFAULT true,
  
  -- Metadatos
  notes TEXT,
  created_by UUID, -- Usuario que creó la plantilla
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabla de períodos de pago semanales
CREATE TABLE public.payment_periods (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  driver_user_id UUID NOT NULL,
  
  -- Período
  week_start_date DATE NOT NULL,
  week_end_date DATE NOT NULL,
  
  -- Ingresos del período
  gross_earnings DECIMAL(10,2) NOT NULL DEFAULT 0, -- Ingresos por cargas
  other_income DECIMAL(10,2) NOT NULL DEFAULT 0, -- Otros ingresos adicionales
  
  -- Cálculos finales
  total_income DECIMAL(10,2) NOT NULL DEFAULT 0, -- gross_earnings + other_income
  total_deductions DECIMAL(10,2) NOT NULL DEFAULT 0,
  net_payment DECIMAL(10,2) NOT NULL DEFAULT 0, -- total_income - total_deductions
  
  -- Alertas y estado
  has_negative_balance BOOLEAN NOT NULL DEFAULT false,
  balance_alert_message TEXT, -- Mensaje de alerta si hay balance negativo
  
  -- Estado del período
  status TEXT NOT NULL DEFAULT 'draft', -- 'draft', 'calculated', 'approved', 'paid'
  
  -- Metadatos
  processed_by UUID, -- Usuario que procesó el período
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabla de instancias de gastos (tanto recurrentes como eventuales)
CREATE TABLE public.expense_instances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  payment_period_id UUID NOT NULL REFERENCES public.payment_periods(id) ON DELETE CASCADE,
  expense_type_id UUID NOT NULL REFERENCES public.expense_types(id),
  recurring_template_id UUID REFERENCES public.recurring_expense_templates(id), -- NULL para gastos eventuales
  
  -- Detalles del gasto
  amount DECIMAL(10,2) NOT NULL,
  description TEXT,
  expense_date DATE, -- Fecha específica del gasto (si aplica)
  
  -- Estado del gasto en el período
  status TEXT NOT NULL DEFAULT 'planned', -- 'planned', 'applied', 'deferred', 'cancelled'
  
  -- Prioridad para aplicación automática
  priority INTEGER NOT NULL DEFAULT 5, -- 1=máxima prioridad, 10=mínima
  is_critical BOOLEAN NOT NULL DEFAULT false, -- Gastos críticos que siempre se aplican
  
  -- Metadatos
  notes TEXT,
  created_by UUID,
  applied_by UUID, -- Usuario que aplicó/aprobó el gasto
  applied_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabla de gastos pendientes (diferidos)
CREATE TABLE public.pending_expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  driver_user_id UUID NOT NULL,
  expense_instance_id UUID NOT NULL REFERENCES public.expense_instances(id),
  original_period_id UUID NOT NULL REFERENCES public.payment_periods(id),
  
  -- Detalles del gasto pendiente
  amount DECIMAL(10,2) NOT NULL,
  reason_deferred TEXT, -- Razón por la cual se difirió
  
  -- Estado
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'applied', 'cancelled'
  applied_to_period_id UUID REFERENCES public.payment_periods(id), -- Período donde finalmente se aplicó
  
  -- Metadatos
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID
);

-- Tabla de historial de cambios en plantillas recurrentes
CREATE TABLE public.expense_template_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES public.recurring_expense_templates(id) ON DELETE CASCADE,
  
  -- Valores anteriores
  previous_amount DECIMAL(10,2) NOT NULL,
  new_amount DECIMAL(10,2) NOT NULL,
  change_reason TEXT,
  
  -- Fechas de vigencia
  effective_from DATE NOT NULL,
  
  -- Metadatos
  changed_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS en todas las tablas
ALTER TABLE public.expense_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_expense_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pending_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_template_history ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para expense_types (visible para todos los usuarios autenticados)
CREATE POLICY "Everyone can view expense types" ON public.expense_types FOR SELECT USING (true);
CREATE POLICY "Company members can manage expense types" ON public.expense_types FOR ALL USING (
  EXISTS(SELECT 1 FROM public.user_company_roles WHERE user_id = auth.uid() AND is_active = true)
);

-- Políticas RLS para recurring_expense_templates
CREATE POLICY "Users can view their own expense templates" ON public.recurring_expense_templates FOR SELECT USING (auth.uid() = driver_user_id);
CREATE POLICY "Company members can view company expense templates" ON public.recurring_expense_templates FOR SELECT USING (
  driver_user_id IN (
    SELECT ucr.user_id FROM public.user_company_roles ucr 
    WHERE ucr.company_id IN (
      SELECT company_id FROM public.user_company_roles 
      WHERE user_id = auth.uid() AND is_active = true
    ) AND ucr.is_active = true
  )
);
CREATE POLICY "Company members can manage expense templates" ON public.recurring_expense_templates FOR ALL USING (
  driver_user_id IN (
    SELECT ucr.user_id FROM public.user_company_roles ucr 
    WHERE ucr.company_id IN (
      SELECT company_id FROM public.user_company_roles 
      WHERE user_id = auth.uid() AND is_active = true
    ) AND ucr.is_active = true
  )
);

-- Políticas RLS para payment_periods
CREATE POLICY "Users can view their own payment periods" ON public.payment_periods FOR SELECT USING (auth.uid() = driver_user_id);
CREATE POLICY "Company members can view company payment periods" ON public.payment_periods FOR SELECT USING (
  driver_user_id IN (
    SELECT ucr.user_id FROM public.user_company_roles ucr 
    WHERE ucr.company_id IN (
      SELECT company_id FROM public.user_company_roles 
      WHERE user_id = auth.uid() AND is_active = true
    ) AND ucr.is_active = true
  )
);
CREATE POLICY "Company members can manage payment periods" ON public.payment_periods FOR ALL USING (
  driver_user_id IN (
    SELECT ucr.user_id FROM public.user_company_roles ucr 
    WHERE ucr.company_id IN (
      SELECT company_id FROM public.user_company_roles 
      WHERE user_id = auth.uid() AND is_active = true
    ) AND ucr.is_active = true
  )
);

-- Políticas RLS para expense_instances
CREATE POLICY "Company members can view expense instances" ON public.expense_instances FOR SELECT USING (
  payment_period_id IN (
    SELECT pp.id FROM public.payment_periods pp
    JOIN public.user_company_roles ucr ON pp.driver_user_id = ucr.user_id
    WHERE ucr.company_id IN (
      SELECT company_id FROM public.user_company_roles 
      WHERE user_id = auth.uid() AND is_active = true
    ) AND ucr.is_active = true
  )
);
CREATE POLICY "Company members can manage expense instances" ON public.expense_instances FOR ALL USING (
  payment_period_id IN (
    SELECT pp.id FROM public.payment_periods pp
    JOIN public.user_company_roles ucr ON pp.driver_user_id = ucr.user_id
    WHERE ucr.company_id IN (
      SELECT company_id FROM public.user_company_roles 
      WHERE user_id = auth.uid() AND is_active = true
    ) AND ucr.is_active = true
  )
);

-- Políticas RLS para pending_expenses
CREATE POLICY "Users can view their own pending expenses" ON public.pending_expenses FOR SELECT USING (auth.uid() = driver_user_id);
CREATE POLICY "Company members can view company pending expenses" ON public.pending_expenses FOR SELECT USING (
  driver_user_id IN (
    SELECT ucr.user_id FROM public.user_company_roles ucr 
    WHERE ucr.company_id IN (
      SELECT company_id FROM public.user_company_roles 
      WHERE user_id = auth.uid() AND is_active = true
    ) AND ucr.is_active = true
  )
);
CREATE POLICY "Company members can manage pending expenses" ON public.pending_expenses FOR ALL USING (
  driver_user_id IN (
    SELECT ucr.user_id FROM public.user_company_roles ucr 
    WHERE ucr.company_id IN (
      SELECT company_id FROM public.user_company_roles 
      WHERE user_id = auth.uid() AND is_active = true
    ) AND ucr.is_active = true
  )
);

-- Políticas RLS para expense_template_history
CREATE POLICY "Company members can view template history" ON public.expense_template_history FOR SELECT USING (
  template_id IN (
    SELECT ret.id FROM public.recurring_expense_templates ret
    JOIN public.user_company_roles ucr ON ret.driver_user_id = ucr.user_id
    WHERE ucr.company_id IN (
      SELECT company_id FROM public.user_company_roles 
      WHERE user_id = auth.uid() AND is_active = true
    ) AND ucr.is_active = true
  )
);
CREATE POLICY "Company members can manage template history" ON public.expense_template_history FOR ALL USING (
  template_id IN (
    SELECT ret.id FROM public.recurring_expense_templates ret
    JOIN public.user_company_roles ucr ON ret.driver_user_id = ucr.user_id
    WHERE ucr.company_id IN (
      SELECT company_id FROM public.user_company_roles 
      WHERE user_id = auth.uid() AND is_active = true
    ) AND ucr.is_active = true
  )
);

-- Políticas para el service role
CREATE POLICY "Service role can manage expense types" ON public.expense_types FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role can manage expense templates" ON public.recurring_expense_templates FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role can manage payment periods" ON public.payment_periods FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role can manage expense instances" ON public.expense_instances FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role can manage pending expenses" ON public.pending_expenses FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role can manage template history" ON public.expense_template_history FOR ALL USING (true) WITH CHECK (true);

-- Índices para mejor performance
CREATE INDEX idx_recurring_expense_templates_driver ON public.recurring_expense_templates(driver_user_id);
CREATE INDEX idx_recurring_expense_templates_active ON public.recurring_expense_templates(is_active) WHERE is_active = true;
CREATE INDEX idx_payment_periods_driver_date ON public.payment_periods(driver_user_id, week_start_date);
CREATE INDEX idx_expense_instances_period ON public.expense_instances(payment_period_id);
CREATE INDEX idx_expense_instances_status ON public.expense_instances(status);
CREATE INDEX idx_pending_expenses_driver ON public.pending_expenses(driver_user_id);
CREATE INDEX idx_pending_expenses_status ON public.pending_expenses(status) WHERE status = 'pending';

-- Triggers para actualizar timestamps
CREATE TRIGGER update_expense_types_updated_at BEFORE UPDATE ON public.expense_types FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_recurring_expense_templates_updated_at BEFORE UPDATE ON public.recurring_expense_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_payment_periods_updated_at BEFORE UPDATE ON public.payment_periods FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_expense_instances_updated_at BEFORE UPDATE ON public.expense_instances FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insertar tipos de gastos base comunes en la industria del transporte
INSERT INTO public.expense_types (name, description, category) VALUES
('Fuel Cards', 'Tarjetas de combustible y gastos relacionados', 'fuel'),
('Insurance Deduction', 'Deducción por seguro del vehículo', 'insurance'),
('Phone/Communication', 'Servicios de comunicación y teléfono', 'communication'),
('ELD/Tracking Device', 'Dispositivo de registro electrónico', 'equipment'),
('Truck Payment', 'Pago del vehículo (lease/financiamiento)', 'vehicle'),
('Maintenance Reserve', 'Reserva para mantenimiento', 'maintenance'),
('Tolls', 'Peajes y gastos de carretera', 'transportation'),
('Permits & Licenses', 'Permisos y licencias', 'regulatory'),
('Uniform/Safety Equipment', 'Uniformes y equipo de seguridad', 'equipment'),
('Training/Certification', 'Capacitación y certificaciones', 'training'),
('Cash Advance', 'Adelantos en efectivo', 'advance'),
('Other Deduction', 'Otras deducciones', 'other');