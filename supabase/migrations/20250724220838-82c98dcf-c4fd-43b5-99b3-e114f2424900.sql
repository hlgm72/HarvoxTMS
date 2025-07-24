-- =====================================================
-- MIGRACIÓN: Sistema de Deducciones - Versión Simplificada
-- =====================================================

-- 1. Crear tabla de plantillas de gastos recurrentes
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
CREATE INDEX IF NOT EXISTS idx_recurring_templates_driver_active ON public.recurring_expense_templates(driver_user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_recurring_templates_effective_dates ON public.recurring_expense_templates(effective_from, effective_until);
CREATE INDEX IF NOT EXISTS idx_recurring_templates_expense_type ON public.recurring_expense_templates(expense_type_id);

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

-- 6. Función para updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Crear trigger para updated_at en recurring_expense_templates
DROP TRIGGER IF EXISTS update_recurring_templates_updated_at ON public.recurring_expense_templates;
CREATE TRIGGER update_recurring_templates_updated_at
  BEFORE UPDATE ON public.recurring_expense_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 8. Insertar tipos de gastos básicos si no existen
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

-- 9. Comentarios para documentación
COMMENT ON TABLE public.recurring_expense_templates IS 'Plantillas de gastos recurrentes para conductores';
COMMENT ON COLUMN public.recurring_expense_templates.frequency_config IS 'Configuración JSON para frecuencias complejas (ej: semana específica del mes)';