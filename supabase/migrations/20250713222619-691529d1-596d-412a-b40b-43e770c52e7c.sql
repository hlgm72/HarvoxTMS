-- Create company equipment table with all required fields
CREATE TABLE public.company_equipment (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  equipment_number TEXT NOT NULL, -- Número del equipo dentro de la compañía
  equipment_type TEXT NOT NULL DEFAULT 'truck', -- truck, trailer, etc.
  year INTEGER,
  make TEXT,
  model TEXT,
  vin_number TEXT,
  license_plate TEXT,
  license_plate_expiry_date DATE,
  annual_inspection_expiry_date DATE,
  status TEXT NOT NULL DEFAULT 'active', -- active, inactive, maintenance, out_of_service
  purchase_date DATE,
  purchase_price NUMERIC(12,2),
  current_mileage INTEGER,
  fuel_type TEXT DEFAULT 'diesel',
  insurance_expiry_date DATE,
  registration_expiry_date DATE,
  notes TEXT,
  geotab_vehicle_id UUID, -- Link to geotab vehicle if applicable
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Constraints
  CONSTRAINT unique_equipment_number_per_company UNIQUE(company_id, equipment_number),
  CONSTRAINT valid_equipment_type CHECK (equipment_type IN ('truck', 'trailer', 'van', 'pickup', 'other')),
  CONSTRAINT valid_status CHECK (status IN ('active', 'inactive', 'maintenance', 'out_of_service', 'sold')),
  CONSTRAINT valid_fuel_type CHECK (fuel_type IN ('diesel', 'gasoline', 'electric', 'hybrid'))
);

-- Create equipment documents table
CREATE TABLE public.equipment_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  equipment_id UUID NOT NULL,
  document_type TEXT NOT NULL,
  document_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  content_type TEXT,
  issue_date DATE,
  expiry_date DATE,
  document_number TEXT, -- Para números de registro, etc.
  issuing_authority TEXT,
  is_current BOOLEAN NOT NULL DEFAULT true,
  uploaded_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Constraints
  CONSTRAINT valid_document_type CHECK (document_type IN ('title', 'registration', 'inspection', 'form_2290', 'insurance', 'permit', 'other'))
);

-- Enable Row Level Security
ALTER TABLE public.company_equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies for company_equipment
CREATE POLICY "Company equipment access policy" 
ON public.company_equipment 
FOR ALL 
USING (
  auth.role() = 'service_role'::text OR (
    auth.role() = 'authenticated'::text AND 
    company_id IN (
      SELECT company_id FROM get_user_company_roles(auth.uid())
    )
  )
)
WITH CHECK (
  auth.role() = 'service_role'::text OR (
    auth.role() = 'authenticated'::text AND 
    company_id IN (
      SELECT company_id FROM get_user_company_roles(auth.uid())
    )
  )
);

-- RLS Policies for equipment_documents
CREATE POLICY "Equipment documents access policy" 
ON public.equipment_documents 
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
CREATE INDEX idx_company_equipment_company_id ON public.company_equipment(company_id);
CREATE INDEX idx_company_equipment_status ON public.company_equipment(status);
CREATE INDEX idx_company_equipment_equipment_type ON public.company_equipment(equipment_type);
CREATE INDEX idx_company_equipment_license_plate ON public.company_equipment(license_plate);
CREATE INDEX idx_company_equipment_vin ON public.company_equipment(vin_number);

CREATE INDEX idx_equipment_documents_equipment_id ON public.equipment_documents(equipment_id);
CREATE INDEX idx_equipment_documents_type ON public.equipment_documents(document_type);
CREATE INDEX idx_equipment_documents_expiry ON public.equipment_documents(expiry_date);
CREATE INDEX idx_equipment_documents_current ON public.equipment_documents(is_current);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_company_equipment_updated_at
  BEFORE UPDATE ON public.company_equipment
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_equipment_documents_updated_at
  BEFORE UPDATE ON public.equipment_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create a view for equipment with document status
CREATE VIEW public.equipment_with_document_status AS
SELECT 
  ce.*,
  CASE 
    WHEN ce.license_plate_expiry_date < CURRENT_DATE THEN 'expired'
    WHEN ce.license_plate_expiry_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'expiring_soon'
    ELSE 'valid'
  END as license_status,
  CASE 
    WHEN ce.annual_inspection_expiry_date < CURRENT_DATE THEN 'expired'
    WHEN ce.annual_inspection_expiry_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'expiring_soon'
    ELSE 'valid'
  END as inspection_status,
  CASE 
    WHEN ce.registration_expiry_date < CURRENT_DATE THEN 'expired'
    WHEN ce.registration_expiry_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'expiring_soon'
    ELSE 'valid'
  END as registration_status,
  (SELECT COUNT(*) FROM equipment_documents ed WHERE ed.equipment_id = ce.id AND ed.document_type = 'title' AND ed.is_current = true) as has_title,
  (SELECT COUNT(*) FROM equipment_documents ed WHERE ed.equipment_id = ce.id AND ed.document_type = 'registration' AND ed.is_current = true) as has_registration,
  (SELECT COUNT(*) FROM equipment_documents ed WHERE ed.equipment_id = ce.id AND ed.document_type = 'inspection' AND ed.is_current = true) as has_inspection,
  (SELECT COUNT(*) FROM equipment_documents ed WHERE ed.equipment_id = ce.id AND ed.document_type = 'form_2290' AND ed.is_current = true) as has_form_2290
FROM public.company_equipment ce;