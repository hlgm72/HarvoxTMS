-- Enable realtime for company_equipment table
ALTER TABLE public.company_equipment REPLICA IDENTITY FULL;

-- Add company_equipment to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.company_equipment;