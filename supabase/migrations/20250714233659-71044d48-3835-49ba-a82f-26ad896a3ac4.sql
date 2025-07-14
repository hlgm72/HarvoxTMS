-- Agregar campos MC Number y DOT Number a la tabla company_brokers
ALTER TABLE public.company_brokers 
ADD COLUMN mc_number TEXT,
ADD COLUMN dot_number TEXT;

-- Agregar comentarios para claridad
COMMENT ON COLUMN public.company_brokers.mc_number IS 'Motor Carrier Number issued by FMCSA';
COMMENT ON COLUMN public.company_brokers.dot_number IS 'Department of Transportation Number';