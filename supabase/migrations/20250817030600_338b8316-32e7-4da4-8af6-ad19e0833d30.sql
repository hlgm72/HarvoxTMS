-- Eliminar TODAS las políticas de load-documents existentes
DROP POLICY IF EXISTS "Users can upload load documents" ON storage.objects;
DROP POLICY IF EXISTS "Load documents company access for viewing" ON storage.objects;
DROP POLICY IF EXISTS "Load documents company access for deletion" ON storage.objects;
DROP POLICY IF EXISTS "Load documents company access for updates" ON storage.objects;

-- Crear política para subir documentos de carga
CREATE POLICY "Load documents upload access"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'load-documents' AND
  auth.role() = 'authenticated' AND
  auth.uid() IS NOT NULL AND
  COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false
);

-- Crear política para ver documentos de carga (drivers ven sus propios docs, admins ven todos de su compañía)
CREATE POLICY "Load documents view access"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'load-documents' AND
  auth.role() = 'authenticated' AND
  auth.uid() IS NOT NULL AND
  COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false AND
  (
    -- El usuario puede ver sus propios documentos
    auth.uid()::text = (storage.foldername(name))[1] 
    OR
    -- Los administradores pueden ver documentos de drivers de su compañía
    EXISTS (
      SELECT 1 FROM user_company_roles ucr1
      JOIN user_company_roles ucr2 ON ucr1.company_id = ucr2.company_id
      WHERE ucr1.user_id = auth.uid()
      AND ucr1.is_active = true
      AND ucr1.role IN ('company_owner', 'operations_manager', 'superadmin')
      AND ucr2.user_id::text = (storage.foldername(name))[1]
      AND ucr2.is_active = true
    )
  )
);

-- Crear política para eliminar documentos de carga
CREATE POLICY "Load documents delete access"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'load-documents' AND
  auth.role() = 'authenticated' AND
  auth.uid() IS NOT NULL AND
  COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false AND
  (
    -- El usuario puede eliminar sus propios documentos
    auth.uid()::text = (storage.foldername(name))[1] 
    OR
    -- Los administradores pueden eliminar documentos de drivers de su compañía
    EXISTS (
      SELECT 1 FROM user_company_roles ucr1
      JOIN user_company_roles ucr2 ON ucr1.company_id = ucr2.company_id
      WHERE ucr1.user_id = auth.uid()
      AND ucr1.is_active = true
      AND ucr1.role IN ('company_owner', 'operations_manager', 'superadmin')
      AND ucr2.user_id::text = (storage.foldername(name))[1]
      AND ucr2.is_active = true
    )
  )
);

-- Crear política para actualizar documentos de carga
CREATE POLICY "Load documents update access"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'load-documents' AND
  auth.role() = 'authenticated' AND
  auth.uid() IS NOT NULL AND
  COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false AND
  (
    -- El usuario puede actualizar sus propios documentos
    auth.uid()::text = (storage.foldername(name))[1] 
    OR
    -- Los administradores pueden actualizar documentos de drivers de su compañía
    EXISTS (
      SELECT 1 FROM user_company_roles ucr1
      JOIN user_company_roles ucr2 ON ucr1.company_id = ucr2.company_id
      WHERE ucr1.user_id = auth.uid()
      AND ucr1.is_active = true
      AND ucr1.role IN ('company_owner', 'operations_manager', 'superadmin')
      AND ucr2.user_id::text = (storage.foldername(name))[1]
      AND ucr2.is_active = true
    )
  )
)
WITH CHECK (
  bucket_id = 'load-documents' AND
  auth.role() = 'authenticated' AND
  auth.uid() IS NOT NULL AND
  COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false
);