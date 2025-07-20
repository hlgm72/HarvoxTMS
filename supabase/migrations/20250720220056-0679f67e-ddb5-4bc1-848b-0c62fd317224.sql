-- Hacer el bucket load-documents público
UPDATE storage.buckets 
SET public = true 
WHERE id = 'load-documents';