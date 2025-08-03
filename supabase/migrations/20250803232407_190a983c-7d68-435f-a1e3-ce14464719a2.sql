-- Añadir campo applied_to_role a las tablas de deducciones
-- Esto permitirá especificar exactamente a qué rol del usuario se aplica la deducción

-- Añadir columna a recurring_expense_templates
ALTER TABLE public.recurring_expense_templates 
ADD COLUMN applied_to_role user_role;

-- Añadir columna a expense_instances
ALTER TABLE public.expense_instances 
ADD COLUMN applied_to_role user_role;

-- Añadir columna a pending_expenses (si existe)
ALTER TABLE public.pending_expenses 
ADD COLUMN applied_to_role user_role;

-- Actualizar registros existentes con valor por defecto basado en el contexto
-- Para recurring_expense_templates, intentar inferir el rol basado en expense_types
UPDATE public.recurring_expense_templates 
SET applied_to_role = 'driver'
WHERE applied_to_role IS NULL;

-- Para expense_instances, usar 'driver' como default
UPDATE public.expense_instances 
SET applied_to_role = 'driver'
WHERE applied_to_role IS NULL;

-- Para pending_expenses, usar 'driver' como default
UPDATE public.pending_expenses 
SET applied_to_role = 'driver'
WHERE applied_to_role IS NULL;