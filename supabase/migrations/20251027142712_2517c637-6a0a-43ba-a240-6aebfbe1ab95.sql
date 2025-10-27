-- Crear políticas RLS para el bucket client-logos

-- Política para permitir a usuarios autenticados ver todos los logos (bucket es público)
CREATE POLICY "Anyone can view client logos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'client-logos');

-- Política para permitir a usuarios autenticados subir logos
CREATE POLICY "Authenticated users can upload client logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'client-logos');

-- Política para permitir a usuarios autenticados actualizar logos
CREATE POLICY "Authenticated users can update client logos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'client-logos')
WITH CHECK (bucket_id = 'client-logos');

-- Política para permitir a usuarios autenticados eliminar logos
CREATE POLICY "Authenticated users can delete client logos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'client-logos');