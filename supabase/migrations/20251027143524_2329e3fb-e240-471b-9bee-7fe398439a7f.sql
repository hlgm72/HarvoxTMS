-- Eliminar políticas de client-logos
DROP POLICY IF EXISTS "Authenticated users can view client logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload client logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update client logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete client logos" ON storage.objects;

-- Recrear con verificación explícita de usuarios NO anónimos
CREATE POLICY "Authenticated non-anonymous users can view client logos"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'client-logos'
  AND auth.role() = 'authenticated'
  AND auth.uid() IS NOT NULL
  AND (auth.jwt()->>'is_anonymous')::boolean IS FALSE
);

CREATE POLICY "Authenticated non-anonymous users can upload client logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'client-logos'
  AND auth.role() = 'authenticated'
  AND auth.uid() IS NOT NULL
  AND (auth.jwt()->>'is_anonymous')::boolean IS FALSE
);

CREATE POLICY "Authenticated non-anonymous users can update client logos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'client-logos'
  AND auth.role() = 'authenticated'
  AND auth.uid() IS NOT NULL
  AND (auth.jwt()->>'is_anonymous')::boolean IS FALSE
)
WITH CHECK (
  bucket_id = 'client-logos'
  AND auth.role() = 'authenticated'
  AND auth.uid() IS NOT NULL
  AND (auth.jwt()->>'is_anonymous')::boolean IS FALSE
);

CREATE POLICY "Authenticated non-anonymous users can delete client logos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'client-logos'
  AND auth.role() = 'authenticated'
  AND auth.uid() IS NOT NULL
  AND (auth.jwt()->>'is_anonymous')::boolean IS FALSE
);