-- Eliminar políticas problemáticas existentes
DROP POLICY IF EXISTS "Users can delete their own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can view files from their company" ON storage.objects;

-- Crear políticas seguras que NO permitan usuarios anónimos
CREATE POLICY "Authenticated users can delete their own files" 
ON storage.objects 
FOR DELETE 
USING (
  auth.role() = 'authenticated' AND
  auth.uid() IS NOT NULL AND
  (auth.jwt()->>'is_anonymous')::boolean IS FALSE AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Authenticated users can update their own files" 
ON storage.objects 
FOR UPDATE 
USING (
  auth.role() = 'authenticated' AND
  auth.uid() IS NOT NULL AND
  (auth.jwt()->>'is_anonymous')::boolean IS FALSE AND
  auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  auth.role() = 'authenticated' AND
  auth.uid() IS NOT NULL AND
  (auth.jwt()->>'is_anonymous')::boolean IS FALSE AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Authenticated users can view files from their company" 
ON storage.objects 
FOR SELECT 
USING (
  auth.role() = 'authenticated' AND
  auth.uid() IS NOT NULL AND
  (auth.jwt()->>'is_anonymous')::boolean IS FALSE AND
  (
    -- Can view own files
    auth.uid()::text = (storage.foldername(name))[1]
    OR
    -- Can view company files if user belongs to same company
    EXISTS (
      SELECT 1 FROM user_company_roles ucr1
      JOIN user_company_roles ucr2 ON ucr1.company_id = ucr2.company_id
      WHERE ucr1.user_id = auth.uid()
      AND ucr2.user_id::text = (storage.foldername(name))[1]
      AND ucr1.is_active = true
      AND ucr2.is_active = true
    )
  )
);