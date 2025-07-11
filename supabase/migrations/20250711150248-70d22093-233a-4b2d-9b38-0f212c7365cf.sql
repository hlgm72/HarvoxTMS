-- Actualizar empresas existentes que tienen "To be configured" como dirección
UPDATE public.companies 
SET street_address = '' 
WHERE street_address = 'To be configured';