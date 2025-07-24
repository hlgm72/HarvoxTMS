-- Crear tabla para plantillas de gastos recurrentes
CREATE TABLE public.recurring_expense_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  driver_user_id UUID NOT NULL,
  expense_type_id UUID NOT NULL REFERENCES public.expense_types(id),
  amount NUMERIC(12,2) NOT NULL,
  frequency TEXT NOT NULL CHECK (frequency IN ('weekly', 'biweekly', 'monthly')),
  frequency_config JSONB,
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_until DATE NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID,
  notes TEXT
);

-- Índices para optimizar consultas
CREATE INDEX idx_recurring_expense_templates_driver ON public.recurring_expense_templates(driver_user_id);
CREATE INDEX idx_recurring_expense_templates_active ON public.recurring_expense_templates(is_active, effective_from, effective_until);
CREATE INDEX idx_recurring_expense_templates_type ON public.recurring_expense_templates(expense_type_id);

-- Trigger para actualizar updated_at
CREATE TRIGGER update_recurring_expense_templates_updated_at
  BEFORE UPDATE ON public.recurring_expense_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Políticas
ALTER TABLE public.recurring_expense_templates ENABLE ROW LEVEL SECURITY;

-- Los conductores pueden ver solo sus propias plantillas
CREATE POLICY "Drivers can view their own expense templates"
  ON public.recurring_expense_templates
  FOR SELECT
  USING (auth.uid() = driver_user_id);

-- Company members pueden ver plantillas de conductores de su empresa
CREATE POLICY "Company members can view driver expense templates"
  ON public.recurring_expense_templates
  FOR SELECT
  USING (
    auth.role() = 'service_role'::text OR
    (auth.role() = 'authenticated'::text AND
     driver_user_id IN (
       SELECT ucr.user_id 
       FROM public.user_company_roles ucr
       WHERE ucr.company_id IN (
         SELECT company_id FROM public.get_user_company_roles(auth.uid())
       ) AND ucr.is_active = true
     ))
  );

-- Company members pueden crear plantillas para conductores de su empresa
CREATE POLICY "Company members can create driver expense templates"
  ON public.recurring_expense_templates
  FOR INSERT
  WITH CHECK (
    auth.role() = 'service_role'::text OR
    (auth.role() = 'authenticated'::text AND
     driver_user_id IN (
       SELECT ucr.user_id 
       FROM public.user_company_roles ucr
       WHERE ucr.company_id IN (
         SELECT company_id FROM public.get_user_company_roles(auth.uid())
       ) AND ucr.is_active = true
     ))
  );

-- Company members pueden actualizar plantillas de conductores de su empresa
CREATE POLICY "Company members can update driver expense templates"
  ON public.recurring_expense_templates
  FOR UPDATE
  USING (
    auth.role() = 'service_role'::text OR
    (auth.role() = 'authenticated'::text AND
     driver_user_id IN (
       SELECT ucr.user_id 
       FROM public.user_company_roles ucr
       WHERE ucr.company_id IN (
         SELECT company_id FROM public.get_user_company_roles(auth.uid())
       ) AND ucr.is_active = true
     ))
  );

-- Solo company owners y operations managers pueden eliminar plantillas
CREATE POLICY "Company owners can delete driver expense templates"
  ON public.recurring_expense_templates
  FOR DELETE
  USING (
    auth.role() = 'service_role'::text OR
    (auth.role() = 'authenticated'::text AND
     driver_user_id IN (
       SELECT ucr.user_id 
       FROM public.user_company_roles ucr
       WHERE ucr.company_id IN (
         SELECT company_id FROM public.get_user_company_roles(auth.uid())
       ) AND ucr.role IN ('company_owner', 'operations_manager')
       AND ucr.is_active = true
     ))
  );