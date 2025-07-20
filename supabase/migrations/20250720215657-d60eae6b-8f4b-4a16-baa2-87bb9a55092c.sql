-- Crear bucket para documentos de cargas
INSERT INTO storage.buckets (id, name, public)
VALUES ('load-documents', 'load-documents', true);

-- Crear políticas para el bucket load-documents
-- Política para ver documentos
CREATE POLICY "Load documents are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'load-documents');

-- Política para subir documentos
CREATE POLICY "Users can upload load documents" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'load-documents' 
  AND auth.uid() IS NOT NULL
);

-- Política para actualizar documentos
CREATE POLICY "Users can update load documents" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'load-documents' 
  AND auth.uid() IS NOT NULL
);

-- Política para eliminar documentos
CREATE POLICY "Users can delete load documents" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'load-documents' 
  AND auth.uid() IS NOT NULL
);