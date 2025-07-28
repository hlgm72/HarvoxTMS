-- Parte 1: Eliminar las políticas RLS primero
DROP POLICY IF EXISTS "Company admins can insert fuel expenses" ON public.fuel_expenses;
DROP POLICY IF EXISTS "Company users can update fuel expenses" ON public.fuel_expenses;
DROP POLICY IF EXISTS "Company users can view fuel expenses" ON public.fuel_expenses;
DROP POLICY IF EXISTS "Company admins can delete fuel expenses" ON public.fuel_expenses;

-- También verificar otros triggers y funciones que podrían depender de la columna
DROP TRIGGER IF EXISTS auto_recalculate_fuel_expenses_trigger ON public.fuel_expenses;
DROP TRIGGER IF EXISTS auto_recalculate_driver_period_totals_trigger ON public.fuel_expenses;