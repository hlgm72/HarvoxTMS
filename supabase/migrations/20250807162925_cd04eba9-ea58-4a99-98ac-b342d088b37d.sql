-- Primero, buscar y restablecer URLs de Clearbit que fueron migrados
-- Necesitamos convertir los URLs de storage de vuelta a Clearbit para poder re-migrar

-- Actualizar los URLs que apuntan al storage roto de vuelta a sus URLs originales de Clearbit
UPDATE company_clients 
SET logo_url = 'https://logo.clearbit.com/' || 
  CASE 
    WHEN name LIKE '%DOUBLE SHIELD%' THEN 'doubleshieldlogistics.com'
    WHEN name LIKE '%FREIGHTSAVER%' THEN 'freightsaver.com'
    WHEN name LIKE '%JONES TRANSPORT%' THEN 'jonestransport.com'
    WHEN name LIKE '%PROJECT FREIGHT%' THEN 'pftransportation.com'
    WHEN name LIKE '%BEEMAC%' THEN 'beemac.com'
    ELSE LOWER(REPLACE(REPLACE(name, ' ', ''), 'INC', '')) || '.com'
  END
WHERE logo_url LIKE '%/storage/v1/object/public/client-logos/%';

-- Crear bucket client-logos si no existe
INSERT INTO storage.buckets (id, name, public) 
VALUES ('client-logos', 'client-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Crear política para acceso público a lectura
CREATE POLICY IF NOT EXISTS "Public read access for client logos" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'client-logos');

-- Crear política para que usuarios autenticados puedan subir logos
CREATE POLICY IF NOT EXISTS "Authenticated users can upload client logos" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'client-logos' AND auth.uid() IS NOT NULL);