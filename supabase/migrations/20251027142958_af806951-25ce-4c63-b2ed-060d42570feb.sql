-- Eliminar la política pública existente
DROP POLICY IF EXISTS "Anyone can view client logos" ON storage.objects;

-- Crear nueva política restringida solo a usuarios autenticados
CREATE POLICY "Authenticated users can view client logos"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'client-logos');