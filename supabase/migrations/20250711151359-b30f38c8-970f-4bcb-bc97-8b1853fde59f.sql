-- Actualizar empresas existentes que tienen "00000" como código postal
UPDATE public.companies 
SET zip_code = '' 
WHERE zip_code = '00000';