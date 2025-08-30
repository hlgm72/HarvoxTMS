-- Eliminar políticas duplicadas para optimizar rendimiento
-- La tabla recurring_expense_exclusions tiene dos políticas idénticas

-- Eliminar la política duplicada exclusions_authorized_access
DROP POLICY IF EXISTS "exclusions_authorized_access" ON public.recurring_expense_exclusions;

-- Mantener solo exclusions_permanent_users_only que ya tiene toda la lógica necesaria
-- (Esta política ya existe y está optimizada desde la migración anterior)