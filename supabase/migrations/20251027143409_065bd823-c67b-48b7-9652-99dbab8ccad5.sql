-- Eliminar políticas de load documents con role public
DROP POLICY IF EXISTS "Users can delete their load documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their load documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload load documents to their own folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can view load documents from their company" ON storage.objects;

-- Recrear con TO authenticated
CREATE POLICY "Authenticated users can delete their load documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'load-documents'
  AND auth.role() = 'authenticated'
  AND auth.uid() IS NOT NULL
  AND (auth.jwt()->>'is_anonymous')::boolean IS FALSE
  AND (storage.foldername(name))[1] IN (
    SELECT company_id::text
    FROM user_company_roles
    WHERE user_id = auth.uid()
      AND is_active = true
  )
);

CREATE POLICY "Authenticated users can update their load documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'load-documents'
  AND auth.role() = 'authenticated'
  AND auth.uid() IS NOT NULL
  AND (auth.jwt()->>'is_anonymous')::boolean IS FALSE
  AND (storage.foldername(name))[1] IN (
    SELECT company_id::text
    FROM user_company_roles
    WHERE user_id = auth.uid()
      AND is_active = true
  )
)
WITH CHECK (
  bucket_id = 'load-documents'
  AND auth.role() = 'authenticated'
  AND auth.uid() IS NOT NULL
  AND (auth.jwt()->>'is_anonymous')::boolean IS FALSE
  AND (storage.foldername(name))[1] IN (
    SELECT company_id::text
    FROM user_company_roles
    WHERE user_id = auth.uid()
      AND is_active = true
  )
);

CREATE POLICY "Authenticated users can upload load documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'load-documents'
  AND auth.role() = 'authenticated'
  AND auth.uid() IS NOT NULL
  AND (auth.jwt()->>'is_anonymous')::boolean IS FALSE
  AND (storage.foldername(name))[1] IN (
    SELECT company_id::text
    FROM user_company_roles
    WHERE user_id = auth.uid()
      AND is_active = true
  )
);

CREATE POLICY "Authenticated users can view load documents from their company"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'load-documents'
  AND auth.role() = 'authenticated'
  AND auth.uid() IS NOT NULL
  AND (auth.jwt()->>'is_anonymous')::boolean IS FALSE
  AND (storage.foldername(name))[1] IN (
    SELECT company_id::text
    FROM user_company_roles
    WHERE user_id = auth.uid()
      AND is_active = true
  )
);