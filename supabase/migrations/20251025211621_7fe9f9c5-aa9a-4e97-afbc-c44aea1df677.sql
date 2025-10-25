-- Tabla facilities simplificada con contacto integrado
CREATE TABLE public.facilities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  -- Información básica
  name TEXT NOT NULL,
  facility_type TEXT NOT NULL CHECK (facility_type IN ('shipper', 'receiver', 'both')),
  
  -- Dirección
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state CHAR(2) NOT NULL REFERENCES public.states(id),
  zip_code TEXT NOT NULL,
  
  -- Contacto (integrado)
  contact_name TEXT,
  contact_phone TEXT,
  
  -- Metadata
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  
  -- Auditoría
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX idx_facilities_company_id ON public.facilities(company_id);
CREATE INDEX idx_facilities_active ON public.facilities(company_id, is_active);
CREATE INDEX idx_facilities_type ON public.facilities(company_id, facility_type);

-- RLS
ALTER TABLE public.facilities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Facilities company access" ON public.facilities
  FOR ALL
  USING (
    auth.uid() IS NOT NULL 
    AND (auth.jwt()->>'is_anonymous')::boolean IS FALSE
    AND company_id IN (
      SELECT company_id FROM user_company_roles
      WHERE user_id = auth.uid() AND is_active = true
    )
  )
  WITH CHECK (
    auth.uid() IS NOT NULL 
    AND (auth.jwt()->>'is_anonymous')::boolean IS FALSE
    AND company_id IN (
      SELECT company_id FROM user_company_roles
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Trigger para updated_at
CREATE TRIGGER update_facilities_updated_at
  BEFORE UPDATE ON public.facilities
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Modificación a load_stops para vincular facilities
ALTER TABLE public.load_stops
ADD COLUMN facility_id UUID REFERENCES public.facilities(id) ON DELETE SET NULL;

CREATE INDEX idx_load_stops_facility_id ON public.load_stops(facility_id);

-- Comentarios para documentación
COMMENT ON TABLE public.facilities IS 'Almacena información de instalaciones (shippers/receivers) de la empresa';
COMMENT ON COLUMN public.facilities.facility_type IS 'Tipo: shipper, receiver, o both';
COMMENT ON COLUMN public.load_stops.facility_id IS 'Vincula el stop con una facility guardada';