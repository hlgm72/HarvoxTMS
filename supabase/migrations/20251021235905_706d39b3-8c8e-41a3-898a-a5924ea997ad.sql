-- ===============================================
-- ELIMINACIÓN DE CAMPOS NO UTILIZADOS
-- Remover priority y is_critical de expense_instances
-- ===============================================

-- Eliminar columnas innecesarias
ALTER TABLE public.expense_instances 
DROP COLUMN IF EXISTS priority,
DROP COLUMN IF EXISTS is_critical;

-- Registrar en auditoría
INSERT INTO public.data_fix_audit (fix_type, records_affected, details)
VALUES (
  'remove_unused_expense_instance_columns',
  0,
  jsonb_build_object(
    'description', 'Eliminación de columnas priority e is_critical de expense_instances',
    'reason', 'Campos no necesarios en el modelo de negocio',
    'columns_removed', ARRAY['priority', 'is_critical'],
    'removed_at', now()
  )
);