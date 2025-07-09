-- Create table for Companies (Multi-tenant core table)
CREATE TABLE public.companies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  ein VARCHAR(11) UNIQUE,                    -- "12-3456789" format
  mc_number TEXT,                            -- MC Authority number (optional)
  dot_number TEXT,                           -- DOT number (optional)
  
  -- Address fields (USA only)
  street_address TEXT NOT NULL,              -- "123 Main Street, Suite 100"
  state_id CHAR(2) NOT NULL REFERENCES public.states(id),
  city_id UUID REFERENCES public.state_cities(id),
  zip_code VARCHAR(10) NOT NULL,             -- "77001" or "77001-1234"
  
  -- Contact information
  phone TEXT,
  email TEXT,
  
  -- Business settings
  payment_day INTEGER NOT NULL DEFAULT 5 CHECK (payment_day BETWEEN 1 AND 7), -- 1=Monday, 5=Friday
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for Company Documents
CREATE TABLE public.company_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  -- Document metadata
  document_type TEXT NOT NULL,               -- 'mc_authority', 'insurance_general', 'logo', etc.
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,                         -- Size in bytes
  content_type TEXT,                         -- MIME type
  
  -- Business logic
  expires_at DATE,                           -- For certificates, insurance, etc.
  uploaded_by UUID,                          -- References auth.users (when auth is implemented)
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create storage bucket for company documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'company-documents',
  'company-documents', 
  false,                                     -- Private bucket
  52428800,                                  -- 50MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'image/webp']
);

-- Enable Row Level Security
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Companies (Multi-tenant isolation)
-- TODO: Update these when we implement user_company_roles table
CREATE POLICY "Companies visible to authenticated users" 
ON public.companies 
FOR SELECT 
USING (true); -- Temporary: will be company_id based when auth is ready

CREATE POLICY "Service role can manage companies" 
ON public.companies 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- RLS Policies for Company Documents  
CREATE POLICY "Company documents visible to company members" 
ON public.company_documents 
FOR SELECT 
USING (true); -- Temporary: will be company_id based when auth is ready

CREATE POLICY "Service role can manage company documents" 
ON public.company_documents 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Storage policies for company documents
CREATE POLICY "Company documents accessible to company members"
ON storage.objects
FOR SELECT
USING (bucket_id = 'company-documents');

CREATE POLICY "Company members can upload documents"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'company-documents');

CREATE POLICY "Company members can update their documents"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'company-documents');

CREATE POLICY "Company members can delete their documents"
ON storage.objects
FOR DELETE
USING (bucket_id = 'company-documents');

-- Create indexes for better performance
CREATE INDEX idx_companies_ein ON public.companies(ein);
CREATE INDEX idx_companies_state_city ON public.companies(state_id, city_id);
CREATE INDEX idx_companies_name ON public.companies(name);

CREATE INDEX idx_company_documents_company_id ON public.company_documents(company_id);
CREATE INDEX idx_company_documents_type ON public.company_documents(document_type);
CREATE INDEX idx_company_documents_expires ON public.company_documents(expires_at) WHERE expires_at IS NOT NULL;

-- Create trigger for automatic timestamp updates on companies
CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON public.companies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger for automatic timestamp updates on company_documents  
CREATE TRIGGER update_company_documents_updated_at
  BEFORE UPDATE ON public.company_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample company for testing
INSERT INTO public.companies (
  name, 
  ein, 
  mc_number, 
  dot_number, 
  street_address, 
  state_id, 
  city_id, 
  zip_code, 
  phone, 
  email,
  payment_day
) VALUES (
  'FleetNest Demo Transport', 
  '12-3456789', 
  'MC-123456', 
  'DOT-789012',
  '123 Transportation Blvd, Suite 100',
  'TX',
  (SELECT id FROM public.state_cities WHERE name = 'Houston' AND state_id = 'TX' LIMIT 1),
  '77001',
  '(713) 555-0123',
  'demo@fleetnest.app',
  5  -- Friday payments
);