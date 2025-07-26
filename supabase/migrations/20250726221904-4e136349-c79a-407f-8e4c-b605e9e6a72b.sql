-- Primero verificar si la tabla equipment_assignments existe y revisar su estructura
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'equipment_assignments' 
AND table_schema = 'public';

-- Crear la tabla equipment_assignments si no existe
CREATE TABLE IF NOT EXISTS public.equipment_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  equipment_id UUID NOT NULL REFERENCES public.company_equipment(id) ON DELETE CASCADE,
  driver_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_date DATE NOT NULL DEFAULT CURRENT_DATE,
  unassigned_date DATE,
  assignment_type TEXT NOT NULL CHECK (assignment_type IN ('permanent', 'temporary')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  assigned_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.equipment_assignments ENABLE ROW LEVEL SECURITY;

-- Crear políticas RLS
CREATE POLICY "Users can view equipment assignments from their company" 
ON public.equipment_assignments 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.company_equipment ce
    WHERE ce.id = equipment_assignments.equipment_id
    AND ce.company_id IN (
      SELECT company_id FROM public.user_company_roles 
      WHERE user_id = auth.uid() AND is_active = true
    )
  )
);

CREATE POLICY "Users can create equipment assignments for their company" 
ON public.equipment_assignments 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.company_equipment ce
    WHERE ce.id = equipment_assignments.equipment_id
    AND ce.company_id IN (
      SELECT company_id FROM public.user_company_roles 
      WHERE user_id = auth.uid() AND is_active = true
    )
  )
);

CREATE POLICY "Users can update equipment assignments from their company" 
ON public.equipment_assignments 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.company_equipment ce
    WHERE ce.id = equipment_assignments.equipment_id
    AND ce.company_id IN (
      SELECT company_id FROM public.user_company_roles 
      WHERE user_id = auth.uid() AND is_active = true
    )
  )
);

-- Crear trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_equipment_assignments_updated_at
BEFORE UPDATE ON public.equipment_assignments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();