-- Eliminar registros huérfanos de load_documents
-- Estos son registros que referencian load_id que ya no existen en la tabla loads
DELETE FROM load_documents 
WHERE load_id NOT IN (SELECT id FROM loads);