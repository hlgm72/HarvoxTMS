-- Create table for fuel card providers
CREATE TABLE public.fuel_card_providers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert the main providers
INSERT INTO public.fuel_card_providers (name, display_name, description) VALUES
  ('fleetone', 'FleetOne', 'FleetOne fuel card provider'),
  ('efs', 'EFS', 'Electronic Funds Source'),
  ('comdata', 'Comdata', 'Comdata fuel card provider'),
  ('loves', 'Love''s Card', 'Love''s Travel Stops fuel card'),
  ('pilot', 'Pilot Axle', 'Pilot Flying J fuel card'),
  ('fuelman', 'Fuelman', 'Fuelman fuel card provider'),
  ('wex', 'WEX', 'WEX fuel card provider');

-- Enable RLS
ALTER TABLE public.fuel_card_providers ENABLE ROW LEVEL SECURITY;

-- Create policy for reading providers (all authenticated users can read)
CREATE POLICY "Authenticated users can view fuel card providers" 
ON public.fuel_card_providers 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- Create policy for managing providers (only company owners and operations managers)
CREATE POLICY "Company managers can manage fuel card providers" 
ON public.fuel_card_providers 
FOR ALL 
USING (
  auth.role() = 'service_role' OR 
  (auth.role() = 'authenticated' AND EXISTS (
    SELECT 1 FROM public.user_company_roles ucr
    WHERE ucr.user_id = auth.uid() 
    AND ucr.role IN ('company_owner', 'operations_manager', 'superadmin')
    AND ucr.is_active = true
  ))
)
WITH CHECK (
  auth.role() = 'service_role' OR 
  (auth.role() = 'authenticated' AND EXISTS (
    SELECT 1 FROM public.user_company_roles ucr
    WHERE ucr.user_id = auth.uid() 
    AND ucr.role IN ('company_owner', 'operations_manager', 'superadmin')
    AND ucr.is_active = true
  ))
);