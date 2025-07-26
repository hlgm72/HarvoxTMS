-- Crear tabla para asignaciones de equipos a conductores
CREATE TABLE public.equipment_assignments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  equipment_id uuid NOT NULL REFERENCES public.company_equipment(id) ON DELETE CASCADE,
  driver_user_id uuid NOT NULL,
  assigned_date date NOT NULL DEFAULT CURRENT_DATE,
  unassigned_date date NULL,
  assignment_type text NOT NULL DEFAULT 'temporary' CHECK (assignment_type IN ('temporary', 'permanent')),
  is_active boolean NOT NULL DEFAULT true,
  notes text NULL,
  assigned_by uuid NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Crear índice único parcial para evitar múltiples asignaciones activas del mismo equipo
CREATE UNIQUE INDEX equipment_assignments_active_unique 
ON public.equipment_assignments (equipment_id) 
WHERE is_active = true;

-- Habilitar RLS
ALTER TABLE public.equipment_assignments ENABLE ROW LEVEL SECURITY;

-- Crear políticas RLS
CREATE POLICY "Equipment assignments company access" 
ON public.equipment_assignments 
FOR ALL 
USING (
  ( SELECT auth.role() ) = 'service_role'::text OR (
    ( SELECT auth.role() ) = 'authenticated'::text AND (
      ( SELECT auth.uid() ) = driver_user_id OR 
      equipment_id IN (
        SELECT ce.id 
        FROM public.company_equipment ce
        WHERE ce.company_id IN (
          SELECT get_user_company_roles.company_id
          FROM get_user_company_roles(( SELECT auth.uid() )) get_user_company_roles(company_id, role)
        )
      )
    )
  )
)
WITH CHECK (
  ( SELECT auth.role() ) = 'service_role'::text OR (
    ( SELECT auth.role() ) = 'authenticated'::text AND 
    equipment_id IN (
      SELECT ce.id 
      FROM public.company_equipment ce
      WHERE ce.company_id IN (
        SELECT get_user_company_roles.company_id
        FROM get_user_company_roles(( SELECT auth.uid() )) get_user_company_roles(company_id, role)
      )
    )
  )
);

-- Trigger para actualizar updated_at
CREATE TRIGGER update_equipment_assignments_updated_at
BEFORE UPDATE ON public.equipment_assignments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();