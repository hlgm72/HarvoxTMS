-- Renombrar driver_user_id a user_id en recurring_expense_templates para mayor flexibilidad
ALTER TABLE public.recurring_expense_templates 
RENAME COLUMN driver_user_id TO user_id;

-- Actualizar el comentario de la columna para reflejar el cambio
COMMENT ON COLUMN public.recurring_expense_templates.user_id IS 'ID del usuario (conductor, dispatcher, etc.) al que se aplica la deducción recurrente';