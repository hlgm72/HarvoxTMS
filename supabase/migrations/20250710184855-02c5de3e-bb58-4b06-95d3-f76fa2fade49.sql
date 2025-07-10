-- Create loads table for managing freight loads
CREATE TABLE public.loads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  load_number TEXT NOT NULL UNIQUE, -- Load reference number
  driver_user_id UUID NOT NULL, -- Reference to the driver
  
  -- Basic load information
  total_amount DECIMAL(12,2) NOT NULL, -- Total freight amount
  currency TEXT NOT NULL DEFAULT 'USD',
  
  -- Owner Operator specific percentages (inherited but can be overridden)
  factoring_percentage DECIMAL(5,2), -- Can be NULL for company drivers
  dispatching_percentage DECIMAL(5,2), -- Can be NULL for company drivers  
  leasing_percentage DECIMAL(5,2), -- Can be NULL for company drivers
  
  -- Load status and dates
  status TEXT NOT NULL DEFAULT 'created', -- created, in_transit, delivered, invoiced, paid
  pickup_date DATE,
  delivery_date DATE,
  
  -- Additional load details
  customer_name TEXT,
  broker_id UUID, -- Reference to company_brokers if applicable
  commodity TEXT, -- Type of freight
  weight_lbs INTEGER,
  notes TEXT,
  
  -- Audit fields
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID
);

-- Create load_stops table for managing multiple stops per load
CREATE TABLE public.load_stops (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  load_id UUID NOT NULL REFERENCES public.loads(id) ON DELETE CASCADE,
  
  -- Stop information
  stop_number INTEGER NOT NULL, -- Order of the stop (1, 2, 3, etc.)
  stop_type TEXT NOT NULL, -- 'pickup' or 'delivery'
  
  -- Address information
  company_name TEXT,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  zip_code TEXT,
  
  -- Timing
  scheduled_date DATE,
  scheduled_time TIME,
  actual_date DATE,
  actual_time TIME,
  
  -- Stop details
  reference_number TEXT, -- BOL, PO number, etc.
  contact_name TEXT,
  contact_phone TEXT,
  special_instructions TEXT,
  
  -- Audit fields
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create load_documents table for BOLs, rate confirmations, etc.
CREATE TABLE public.load_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  load_id UUID NOT NULL REFERENCES public.loads(id) ON DELETE CASCADE,
  
  document_type TEXT NOT NULL, -- 'bol', 'rate_confirmation', 'invoice', 'receipt', etc.
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  content_type TEXT,
  
  uploaded_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.loads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.load_stops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.load_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies for loads
CREATE POLICY "Company members can view company loads" 
ON public.loads 
FOR SELECT 
USING (
  driver_user_id IN (
    SELECT ucr.user_id 
    FROM public.user_company_roles ucr 
    WHERE ucr.company_id IN (
      SELECT company_id 
      FROM public.user_company_roles 
      WHERE user_id = auth.uid() AND is_active = true
    ) 
    AND ucr.is_active = true
  )
);

CREATE POLICY "Company members can manage company loads" 
ON public.loads 
FOR ALL 
USING (
  driver_user_id IN (
    SELECT ucr.user_id 
    FROM public.user_company_roles ucr 
    WHERE ucr.company_id IN (
      SELECT company_id 
      FROM public.user_company_roles 
      WHERE user_id = auth.uid() AND is_active = true
    ) 
    AND ucr.is_active = true
  )
);

CREATE POLICY "Drivers can view their own loads" 
ON public.loads 
FOR SELECT 
USING (auth.uid() = driver_user_id);

-- RLS Policies for load_stops
CREATE POLICY "Company members can view load stops" 
ON public.load_stops 
FOR SELECT 
USING (
  load_id IN (
    SELECT l.id FROM public.loads l
    JOIN public.user_company_roles ucr ON l.driver_user_id = ucr.user_id
    WHERE ucr.company_id IN (
      SELECT company_id 
      FROM public.user_company_roles 
      WHERE user_id = auth.uid() AND is_active = true
    ) 
    AND ucr.is_active = true
  )
);

CREATE POLICY "Company members can manage load stops" 
ON public.load_stops 
FOR ALL 
USING (
  load_id IN (
    SELECT l.id FROM public.loads l
    JOIN public.user_company_roles ucr ON l.driver_user_id = ucr.user_id
    WHERE ucr.company_id IN (
      SELECT company_id 
      FROM public.user_company_roles 
      WHERE user_id = auth.uid() AND is_active = true
    ) 
    AND ucr.is_active = true
  )
);

-- RLS Policies for load_documents  
CREATE POLICY "Company members can view load documents" 
ON public.load_documents 
FOR SELECT 
USING (
  load_id IN (
    SELECT l.id FROM public.loads l
    JOIN public.user_company_roles ucr ON l.driver_user_id = ucr.user_id
    WHERE ucr.company_id IN (
      SELECT company_id 
      FROM public.user_company_roles 
      WHERE user_id = auth.uid() AND is_active = true
    ) 
    AND ucr.is_active = true
  )
);

CREATE POLICY "Company members can manage load documents" 
ON public.load_documents 
FOR ALL 
USING (
  load_id IN (
    SELECT l.id FROM public.loads l
    JOIN public.user_company_roles ucr ON l.driver_user_id = ucr.user_id
    WHERE ucr.company_id IN (
      SELECT company_id 
      FROM public.user_company_roles 
      WHERE user_id = auth.uid() AND is_active = true
    ) 
    AND ucr.is_active = true
  )
);

-- Service role policies
CREATE POLICY "Service role can manage loads" 
ON public.loads FOR ALL 
USING (true) WITH CHECK (true);

CREATE POLICY "Service role can manage load stops" 
ON public.load_stops FOR ALL 
USING (true) WITH CHECK (true);

CREATE POLICY "Service role can manage load documents" 
ON public.load_documents FOR ALL 
USING (true) WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX idx_loads_driver_user_id ON public.loads(driver_user_id);
CREATE INDEX idx_loads_status ON public.loads(status);
CREATE INDEX idx_loads_pickup_date ON public.loads(pickup_date);
CREATE INDEX idx_loads_load_number ON public.loads(load_number);

CREATE INDEX idx_load_stops_load_id ON public.load_stops(load_id);
CREATE INDEX idx_load_stops_stop_number ON public.load_stops(load_id, stop_number);

CREATE INDEX idx_load_documents_load_id ON public.load_documents(load_id);
CREATE INDEX idx_load_documents_type ON public.load_documents(document_type);

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_loads_updated_at
  BEFORE UPDATE ON public.loads
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_load_stops_updated_at
  BEFORE UPDATE ON public.load_stops
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to automatically inherit owner operator percentages when creating a load
CREATE OR REPLACE FUNCTION public.inherit_owner_operator_percentages()
RETURNS TRIGGER AS $$
BEGIN
  -- Only apply to Owner Operators, not Company Drivers
  IF EXISTS (
    SELECT 1 FROM public.owner_operators 
    WHERE user_id = NEW.driver_user_id AND is_active = true
  ) THEN
    -- If percentages are not explicitly set, inherit from owner_operators table
    IF NEW.factoring_percentage IS NULL OR NEW.dispatching_percentage IS NULL OR NEW.leasing_percentage IS NULL THEN
      SELECT 
        COALESCE(NEW.factoring_percentage, oo.factoring_percentage),
        COALESCE(NEW.dispatching_percentage, oo.dispatching_percentage),
        COALESCE(NEW.leasing_percentage, oo.leasing_percentage)
      INTO 
        NEW.factoring_percentage,
        NEW.dispatching_percentage,
        NEW.leasing_percentage
      FROM public.owner_operators oo
      WHERE oo.user_id = NEW.driver_user_id AND oo.is_active = true;
    END IF;
  ELSE
    -- For Company Drivers, set percentages to NULL
    NEW.factoring_percentage := NULL;
    NEW.dispatching_percentage := NULL;
    NEW.leasing_percentage := NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to inherit percentages on insert
CREATE TRIGGER inherit_percentages_on_load_insert
  BEFORE INSERT ON public.loads
  FOR EACH ROW
  EXECUTE FUNCTION public.inherit_owner_operator_percentages();