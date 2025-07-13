-- Add alias and logo_url columns to company_brokers table
ALTER TABLE public.company_brokers 
ADD COLUMN alias TEXT,
ADD COLUMN logo_url TEXT;

-- Create comment for documentation
COMMENT ON COLUMN public.company_brokers.alias IS 'Short name or commercial name for the client/broker';
COMMENT ON COLUMN public.company_brokers.logo_url IS 'URL to the client/broker logo stored in Supabase storage';

-- Create storage bucket for client logos if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('client-logos', 'client-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for client logos
CREATE POLICY "Client logos are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'client-logos');

CREATE POLICY "Authenticated users can upload client logos" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'client-logos' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Authenticated users can update client logos" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'client-logos' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Authenticated users can delete client logos" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'client-logos' 
  AND auth.role() = 'authenticated'
);