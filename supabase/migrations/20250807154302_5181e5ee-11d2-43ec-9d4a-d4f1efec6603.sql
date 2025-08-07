-- Eliminar todos los archivos huérfanos del bucket load-documents
-- Estos archivos referencian load_ids que ya no existen

DELETE FROM storage.objects 
WHERE bucket_id = 'load-documents' 
AND (
  -- Archivos con formato de ruta duplicada
  (name LIKE 'load-documents/%' AND 
   split_part(split_part(name, '/', 2), '/', 1) NOT IN (SELECT id::text FROM loads))
  OR
  -- Archivos con formato de ruta normal
  (name NOT LIKE 'load-documents/%' AND 
   split_part(name, '/', 1) NOT IN (SELECT id::text FROM loads))
);