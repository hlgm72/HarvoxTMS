-- Eliminar políticas con role public incorrectas
DROP POLICY IF EXISTS "Authenticated users can delete their own files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update their own files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view files from their company" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can insert their own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own files" ON storage.objects;

-- Recrear con TO authenticated (no TO public)
CREATE POLICY "Authenticated users can delete their own files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  auth.role() = 'authenticated' 
  AND auth.uid() IS NOT NULL 
  AND (auth.jwt()->>'is_anonymous')::boolean IS FALSE 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Authenticated users can update their own files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  auth.role() = 'authenticated' 
  AND auth.uid() IS NOT NULL 
  AND (auth.jwt()->>'is_anonymous')::boolean IS FALSE 
  AND auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  auth.role() = 'authenticated' 
  AND auth.uid() IS NOT NULL 
  AND (auth.jwt()->>'is_anonymous')::boolean IS FALSE 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Authenticated users can view files from their company"
ON storage.objects FOR SELECT
TO authenticated
USING (
  auth.role() = 'authenticated' 
  AND auth.uid() IS NOT NULL 
  AND (auth.jwt()->>'is_anonymous')::boolean IS FALSE 
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR EXISTS (
      SELECT 1 FROM user_company_roles ucr1
      JOIN user_company_roles ucr2 ON ucr1.company_id = ucr2.company_id
      WHERE ucr1.user_id = auth.uid()
        AND ucr1.is_active = true
        AND ucr2.user_id::text = (storage.foldername(name))[1]
        AND ucr2.is_active = true
    )
  )
);