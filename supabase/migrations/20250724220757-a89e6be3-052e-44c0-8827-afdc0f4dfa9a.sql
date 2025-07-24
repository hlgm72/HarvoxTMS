-- =====================================================
-- MIGRACIÓN: Sistema de Deducciones - Tablas Principales (Corregida)
-- =====================================================

-- 1. Crear tabla de plantillas de gastos recurrentes (sin company_id directo)
CREATE TABLE IF NOT EXISTS public.recurring_expense_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  driver_user_id UUID NOT NULL,
  expense_type_id UUID NOT NULL REFERENCES public.expense_types(id) ON DELETE RESTRICT,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  frequency TEXT NOT NULL CHECK (frequency IN ('weekly', 'biweekly', 'monthly')),
  frequency_config JSONB DEFAULT NULL,
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_until DATE DEFAULT NULL,
  notes TEXT DEFAULT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID DEFAULT auth.uid(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Constraints
  CONSTRAINT check_effective_dates CHECK (effective_until IS NULL OR effective_until >= effective_from)
);

-- 2. Crear índices para optimizar consultas
CREATE INDEX idx_recurring_templates_driver_active ON public.recurring_expense_templates(driver_user_id, is_active);
CREATE INDEX idx_recurring_templates_effective_dates ON public.recurring_expense_templates(effective_from, effective_until);
CREATE INDEX idx_recurring_templates_expense_type ON public.recurring_expense_templates(expense_type_id);

-- 3. Habilitar RLS
ALTER TABLE public.recurring_expense_templates ENABLE ROW LEVEL SECURITY;

-- 4. Crear políticas RLS para recurring_expense_templates
CREATE POLICY "Recurring templates company access" 
ON public.recurring_expense_templates
FOR ALL
USING (
  auth.role() = 'service_role'::text OR (
    auth.role() = 'authenticated'::text AND
    driver_user_id IN (
      SELECT ucr.user_id 
      FROM public.user_company_roles ucr
      WHERE ucr.company_id IN (
        SELECT get_user_company_roles.company_id
        FROM get_user_company_roles(auth.uid())
      ) AND ucr.is_active = true
    )
  )
)
WITH CHECK (
  auth.role() = 'service_role'::text OR (
    auth.role() = 'authenticated'::text AND
    driver_user_id IN (
      SELECT ucr.user_id 
      FROM public.user_company_roles ucr
      WHERE ucr.company_id IN (
        SELECT get_user_company_roles.company_id
        FROM get_user_company_roles(auth.uid())
      ) AND ucr.is_active = true
    )
  )
);

-- 5. Actualizar expense_instances para usar las nuevas plantillas
ALTER TABLE public.expense_instances 
ADD COLUMN IF NOT EXISTS recurring_template_id UUID REFERENCES public.recurring_expense_templates(id) ON DELETE SET NULL;

-- 6. Crear tabla para historial de cambios en plantillas
CREATE TABLE IF NOT EXISTS public.expense_template_changes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES public.recurring_expense_templates(id) ON DELETE CASCADE,
  change_type TEXT NOT NULL CHECK (change_type IN ('created', 'amount_changed', 'frequency_changed', 'deactivated', 'reactivated')),
  previous_values JSONB DEFAULT NULL,
  new_values JSONB NOT NULL,
  change_reason TEXT DEFAULT NULL,
  changed_by UUID DEFAULT auth.uid(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 7. Crear índice para el historial
CREATE INDEX idx_template_changes_template_date ON public.expense_template_changes(template_id, created_at DESC);

-- 8. RLS para historial de cambios
ALTER TABLE public.expense_template_changes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Template changes company access" 
ON public.expense_template_changes
FOR ALL
USING (
  auth.role() = 'service_role'::text OR (
    auth.role() = 'authenticated'::text AND
    template_id IN (
      SELECT ret.id 
      FROM public.recurring_expense_templates ret
      JOIN public.user_company_roles ucr ON ret.driver_user_id = ucr.user_id
      WHERE ucr.company_id IN (
        SELECT get_user_company_roles.company_id
        FROM get_user_company_roles(auth.uid())
      ) AND ucr.is_active = true
    )
  )
)
WITH CHECK (
  auth.role() = 'service_role'::text OR (
    auth.role() = 'authenticated'::text AND
    template_id IN (
      SELECT ret.id 
      FROM public.recurring_expense_templates ret
      JOIN public.user_company_roles ucr ON ret.driver_user_id = ucr.user_id
      WHERE ucr.company_id IN (
        SELECT get_user_company_roles.company_id
        FROM get_user_company_roles(auth.uid())
      ) AND ucr.is_active = true
    )
  )
);

-- 9. Función para registrar cambios automáticamente
CREATE OR REPLACE FUNCTION public.log_template_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.expense_template_changes (
      template_id, change_type, new_values, change_reason, changed_by
    ) VALUES (
      NEW.id, 'created', 
      jsonb_build_object(
        'amount', NEW.amount,
        'frequency', NEW.frequency,
        'effective_from', NEW.effective_from,
        'effective_until', NEW.effective_until
      ),
      'Template created',
      NEW.created_by
    );
    
  ELSIF TG_OP = 'UPDATE' THEN
    DECLARE
      change_type_val TEXT;
      prev_values JSONB;
      new_values JSONB;
    BEGIN
      -- Determinar tipo de cambio
      IF OLD.amount != NEW.amount THEN
        change_type_val := 'amount_changed';
      ELSIF OLD.frequency != NEW.frequency THEN
        change_type_val := 'frequency_changed';
      ELSIF OLD.is_active != NEW.is_active THEN
        change_type_val := CASE WHEN NEW.is_active THEN 'reactivated' ELSE 'deactivated' END;
      ELSE
        change_type_val := 'updated';
      END IF;
      
      -- Construir valores anteriores y nuevos
      prev_values := jsonb_build_object(
        'amount', OLD.amount,
        'frequency', OLD.frequency,
        'is_active', OLD.is_active,
        'effective_until', OLD.effective_until
      );
      
      new_values := jsonb_build_object(
        'amount', NEW.amount,
        'frequency', NEW.frequency,
        'is_active', NEW.is_active,
        'effective_until', NEW.effective_until
      );
      
      INSERT INTO public.expense_template_changes (
        template_id, change_type, previous_values, new_values, changed_by
      ) VALUES (
        NEW.id, change_type_val, prev_values, new_values, auth.uid()
      );
    END;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Crear trigger para cambios automáticos
CREATE TRIGGER trigger_log_template_changes
  AFTER INSERT OR UPDATE ON public.recurring_expense_templates
  FOR EACH ROW EXECUTE FUNCTION public.log_template_changes();

-- 11. Función para updated_at (si no existe)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 12. Crear trigger para updated_at en recurring_expense_templates
CREATE TRIGGER update_recurring_templates_updated_at
  BEFORE UPDATE ON public.recurring_expense_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 13. Insertar tipos de gastos básicos si no existen
INSERT INTO public.expense_types (name, category, description) 
VALUES 
  ('Combustible', 'Operativo', 'Gastos de combustible y diésel'),
  ('Mantenimiento', 'Vehículo', 'Mantenimiento preventivo y correctivo'),
  ('Seguro', 'Administrativo', 'Pólizas de seguro de vehículos'),
  ('Préstamos', 'Financiero', 'Pagos de préstamos y financiamiento'),
  ('Peajes', 'Operativo', 'Gastos en peajes y casetas'),
  ('Estacionamiento', 'Operativo', 'Costos de estacionamiento'),
  ('Lavado', 'Mantenimiento', 'Servicios de lavado de vehículos'),
  ('Inspecciones', 'Regulatorio', 'Inspecciones anuales y DOT'),
  ('Licencias', 'Regulatorio', 'Renovación de licencias y permisos'),
  ('Otros', 'Varios', 'Gastos miscéláneos')
ON CONFLICT (name) DO NOTHING;

-- 14. Comentarios para documentación
COMMENT ON TABLE public.recurring_expense_templates IS 'Plantillas de gastos recurrentes para conductores';
COMMENT ON COLUMN public.recurring_expense_templates.frequency_config IS 'Configuración JSON para frecuencias complejas (ej: semana específica del mes)';
COMMENT ON TABLE public.expense_template_changes IS 'Historial de cambios en plantillas de gastos para auditoría';