-- Create storage bucket for equipment documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('equipment-documents', 'equipment-documents', true);

-- Create storage policies for equipment documents
CREATE POLICY "Equipment documents are viewable by company members" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'equipment-documents' AND 
  (storage.foldername(name))[1] IN (
    SELECT ce.company_id::text 
    FROM company_equipment ce
    WHERE ce.company_id IN (
      SELECT company_id FROM get_user_company_roles(auth.uid())
    )
  )
);

CREATE POLICY "Users can upload equipment documents for their company" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'equipment-documents' AND 
  (storage.foldername(name))[1] IN (
    SELECT ce.company_id::text 
    FROM company_equipment ce
    WHERE ce.company_id IN (
      SELECT company_id FROM get_user_company_roles(auth.uid())
    )
  )
);

CREATE POLICY "Users can update equipment documents for their company" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'equipment-documents' AND 
  (storage.foldername(name))[1] IN (
    SELECT ce.company_id::text 
    FROM company_equipment ce
    WHERE ce.company_id IN (
      SELECT company_id FROM get_user_company_roles(auth.uid())
    )
  )
);

CREATE POLICY "Users can delete equipment documents for their company" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'equipment-documents' AND 
  (storage.foldername(name))[1] IN (
    SELECT ce.company_id::text 
    FROM company_equipment ce
    WHERE ce.company_id IN (
      SELECT company_id FROM get_user_company_roles(auth.uid())
    )
  )
);

-- Create maintenance types table
CREATE TABLE public.maintenance_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'preventive', -- preventive, corrective, emergency
  estimated_duration_hours NUMERIC(5,2),
  estimated_cost NUMERIC(10,2),
  required_parts TEXT[], -- Array of required parts
  safety_requirements TEXT[],
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  CONSTRAINT valid_maintenance_category CHECK (category IN ('preventive', 'corrective', 'emergency', 'inspection'))
);

-- Create maintenance schedules table
CREATE TABLE public.maintenance_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  equipment_id UUID NOT NULL,
  maintenance_type_id UUID NOT NULL,
  frequency_type TEXT NOT NULL, -- mileage, time, engine_hours
  frequency_value INTEGER NOT NULL, -- e.g., 5000 miles, 30 days, 250 hours
  last_performed_date DATE,
  last_performed_mileage INTEGER,
  next_due_date DATE,
  next_due_mileage INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  CONSTRAINT valid_frequency_type CHECK (frequency_type IN ('mileage', 'time', 'engine_hours', 'manual'))
);

-- Create maintenance records table
CREATE TABLE public.maintenance_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  equipment_id UUID NOT NULL,
  maintenance_type_id UUID NOT NULL,
  schedule_id UUID, -- Optional, if it was scheduled maintenance
  performed_date DATE NOT NULL,
  performed_by TEXT NOT NULL, -- Technician name or company
  mileage_at_service INTEGER,
  engine_hours_at_service NUMERIC(8,1),
  labor_cost NUMERIC(10,2) DEFAULT 0,
  parts_cost NUMERIC(10,2) DEFAULT 0,
  total_cost NUMERIC(10,2) DEFAULT 0,
  work_description TEXT,
  parts_used TEXT[],
  notes TEXT,
  receipt_url TEXT,
  next_service_due_date DATE,
  next_service_due_mileage INTEGER,
  status TEXT NOT NULL DEFAULT 'completed',
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  CONSTRAINT valid_maintenance_status CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled'))
);

-- Create inspections table
CREATE TABLE public.inspections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  equipment_id UUID NOT NULL,
  inspection_type TEXT NOT NULL, -- daily, weekly, monthly, annual, dot
  inspection_date DATE NOT NULL,
  inspector_name TEXT NOT NULL,
  inspector_license TEXT,
  odometer_reading INTEGER,
  engine_hours NUMERIC(8,1),
  inspection_items JSONB, -- Detailed inspection checklist results
  defects_found TEXT[],
  overall_status TEXT NOT NULL DEFAULT 'pass', -- pass, conditional, fail
  certificate_number TEXT,
  certificate_expiry_date DATE,
  inspection_location TEXT,
  cost NUMERIC(8,2),
  notes TEXT,
  report_url TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  CONSTRAINT valid_inspection_type CHECK (inspection_type IN ('daily', 'weekly', 'monthly', 'annual', 'dot', 'safety', 'emissions')),
  CONSTRAINT valid_inspection_status CHECK (overall_status IN ('pass', 'conditional', 'fail', 'pending'))
);

-- Create equipment assignments table
CREATE TABLE public.equipment_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  equipment_id UUID NOT NULL,
  driver_user_id UUID NOT NULL,
  assigned_date DATE NOT NULL DEFAULT CURRENT_DATE,
  unassigned_date DATE,
  assignment_type TEXT NOT NULL DEFAULT 'temporary', -- permanent, temporary, dispatch
  notes TEXT,
  assigned_by UUID,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  CONSTRAINT valid_assignment_type CHECK (assignment_type IN ('permanent', 'temporary', 'dispatch', 'backup')),
  CONSTRAINT valid_date_range CHECK (unassigned_date IS NULL OR unassigned_date >= assigned_date)
);

-- Create equipment locations table
CREATE TABLE public.equipment_locations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  equipment_id UUID NOT NULL,
  location_type TEXT NOT NULL DEFAULT 'current', -- current, parked, maintenance, terminal
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  address TEXT,
  facility_name TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  reported_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reported_by UUID,
  notes TEXT,
  is_current BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  CONSTRAINT valid_location_type CHECK (location_type IN ('current', 'parked', 'maintenance', 'terminal', 'customer', 'breakdown'))
);

-- Enable Row Level Security
ALTER TABLE public.maintenance_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment_locations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for maintenance_types (global, readable by all authenticated users)
CREATE POLICY "Maintenance types are viewable by authenticated users" 
ON public.maintenance_types 
FOR SELECT 
USING (auth.role() = 'authenticated'::text);

CREATE POLICY "Maintenance types are manageable by admins" 
ON public.maintenance_types 
FOR ALL 
USING (
  auth.role() = 'service_role'::text OR (
    auth.role() = 'authenticated'::text AND 
    EXISTS (
      SELECT 1 FROM get_user_company_roles(auth.uid()) 
      WHERE role IN ('company_owner', 'operations_manager', 'senior_dispatcher')
    )
  )
)
WITH CHECK (
  auth.role() = 'service_role'::text OR (
    auth.role() = 'authenticated'::text AND 
    EXISTS (
      SELECT 1 FROM get_user_company_roles(auth.uid()) 
      WHERE role IN ('company_owner', 'operations_manager', 'senior_dispatcher')
    )
  )
);

-- RLS Policies for maintenance_schedules
CREATE POLICY "Maintenance schedules company access" 
ON public.maintenance_schedules 
FOR ALL 
USING (
  auth.role() = 'service_role'::text OR (
    auth.role() = 'authenticated'::text AND 
    equipment_id IN (
      SELECT ce.id FROM company_equipment ce
      WHERE ce.company_id IN (
        SELECT company_id FROM get_user_company_roles(auth.uid())
      )
    )
  )
)
WITH CHECK (
  auth.role() = 'service_role'::text OR (
    auth.role() = 'authenticated'::text AND 
    equipment_id IN (
      SELECT ce.id FROM company_equipment ce
      WHERE ce.company_id IN (
        SELECT company_id FROM get_user_company_roles(auth.uid())
      )
    )
  )
);

-- RLS Policies for maintenance_records
CREATE POLICY "Maintenance records company access" 
ON public.maintenance_records 
FOR ALL 
USING (
  auth.role() = 'service_role'::text OR (
    auth.role() = 'authenticated'::text AND 
    equipment_id IN (
      SELECT ce.id FROM company_equipment ce
      WHERE ce.company_id IN (
        SELECT company_id FROM get_user_company_roles(auth.uid())
      )
    )
  )
)
WITH CHECK (
  auth.role() = 'service_role'::text OR (
    auth.role() = 'authenticated'::text AND 
    equipment_id IN (
      SELECT ce.id FROM company_equipment ce
      WHERE ce.company_id IN (
        SELECT company_id FROM get_user_company_roles(auth.uid())
      )
    )
  )
);

-- RLS Policies for inspections
CREATE POLICY "Inspections company access" 
ON public.inspections 
FOR ALL 
USING (
  auth.role() = 'service_role'::text OR (
    auth.role() = 'authenticated'::text AND 
    equipment_id IN (
      SELECT ce.id FROM company_equipment ce
      WHERE ce.company_id IN (
        SELECT company_id FROM get_user_company_roles(auth.uid())
      )
    )
  )
)
WITH CHECK (
  auth.role() = 'service_role'::text OR (
    auth.role() = 'authenticated'::text AND 
    equipment_id IN (
      SELECT ce.id FROM company_equipment ce
      WHERE ce.company_id IN (
        SELECT company_id FROM get_user_company_roles(auth.uid())
      )
    )
  )
);

-- RLS Policies for equipment_assignments
CREATE POLICY "Equipment assignments company access" 
ON public.equipment_assignments 
FOR ALL 
USING (
  auth.role() = 'service_role'::text OR (
    auth.role() = 'authenticated'::text AND (
      auth.uid() = driver_user_id OR
      equipment_id IN (
        SELECT ce.id FROM company_equipment ce
        WHERE ce.company_id IN (
          SELECT company_id FROM get_user_company_roles(auth.uid())
        )
      )
    )
  )
)
WITH CHECK (
  auth.role() = 'service_role'::text OR (
    auth.role() = 'authenticated'::text AND 
    equipment_id IN (
      SELECT ce.id FROM company_equipment ce
      WHERE ce.company_id IN (
        SELECT company_id FROM get_user_company_roles(auth.uid())
      )
    )
  )
);

-- RLS Policies for equipment_locations
CREATE POLICY "Equipment locations company access" 
ON public.equipment_locations 
FOR ALL 
USING (
  auth.role() = 'service_role'::text OR (
    auth.role() = 'authenticated'::text AND 
    equipment_id IN (
      SELECT ce.id FROM company_equipment ce
      WHERE ce.company_id IN (
        SELECT company_id FROM get_user_company_roles(auth.uid())
      )
    )
  )
)
WITH CHECK (
  auth.role() = 'service_role'::text OR (
    auth.role() = 'authenticated'::text AND 
    equipment_id IN (
      SELECT ce.id FROM company_equipment ce
      WHERE ce.company_id IN (
        SELECT company_id FROM get_user_company_roles(auth.uid())
      )
    )
  )
);

-- Create indexes for better performance
CREATE INDEX idx_maintenance_schedules_equipment_id ON public.maintenance_schedules(equipment_id);
CREATE INDEX idx_maintenance_schedules_next_due_date ON public.maintenance_schedules(next_due_date);
CREATE INDEX idx_maintenance_schedules_active ON public.maintenance_schedules(is_active);

CREATE INDEX idx_maintenance_records_equipment_id ON public.maintenance_records(equipment_id);
CREATE INDEX idx_maintenance_records_performed_date ON public.maintenance_records(performed_date);
CREATE INDEX idx_maintenance_records_status ON public.maintenance_records(status);

CREATE INDEX idx_inspections_equipment_id ON public.inspections(equipment_id);
CREATE INDEX idx_inspections_date ON public.inspections(inspection_date);
CREATE INDEX idx_inspections_type ON public.inspections(inspection_type);
CREATE INDEX idx_inspections_status ON public.inspections(overall_status);

CREATE INDEX idx_equipment_assignments_equipment_id ON public.equipment_assignments(equipment_id);
CREATE INDEX idx_equipment_assignments_driver_id ON public.equipment_assignments(driver_user_id);
CREATE INDEX idx_equipment_assignments_active ON public.equipment_assignments(is_active);

CREATE INDEX idx_equipment_locations_equipment_id ON public.equipment_locations(equipment_id);
CREATE INDEX idx_equipment_locations_reported_at ON public.equipment_locations(reported_at);
CREATE INDEX idx_equipment_locations_current ON public.equipment_locations(is_current);

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_maintenance_types_updated_at
  BEFORE UPDATE ON public.maintenance_types
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_maintenance_schedules_updated_at
  BEFORE UPDATE ON public.maintenance_schedules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_maintenance_records_updated_at
  BEFORE UPDATE ON public.maintenance_records
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_inspections_updated_at
  BEFORE UPDATE ON public.inspections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_equipment_assignments_updated_at
  BEFORE UPDATE ON public.equipment_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();