-- Eliminar columna 'description' de expense_instances
-- Solo se usará 'notes' para información manual del usuario

ALTER TABLE expense_instances 
DROP COLUMN IF EXISTS description;