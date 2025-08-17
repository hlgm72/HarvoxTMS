-- Hacer privados los buckets críticos de seguridad
UPDATE storage.buckets 
SET public = false 
WHERE id IN ('load-documents', 'equipment-documents');

-- Verificar que los buckets críticos estén privados
SELECT id, name, public 
FROM storage.buckets 
WHERE id IN ('load-documents', 'equipment-documents', 'company-documents')
ORDER BY name;