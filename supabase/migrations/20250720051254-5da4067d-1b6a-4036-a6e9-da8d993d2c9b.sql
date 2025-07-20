-- Aplicar cambios de constraints ahora que las referencias están limpiadas

-- 1. Modificar tabla loads para referenciar company_payment_periods
ALTER TABLE public.loads 
DROP CONSTRAINT IF EXISTS loads_payment_period_id_fkey;

ALTER TABLE public.loads 
ADD CONSTRAINT loads_payment_period_id_fkey 
FOREIGN KEY (payment_period_id) 
REFERENCES public.company_payment_periods(id);

-- 2. Actualizar también fuel_expenses, expense_instances y other_income
ALTER TABLE public.fuel_expenses 
DROP CONSTRAINT IF EXISTS fuel_expenses_payment_period_id_fkey;

ALTER TABLE public.fuel_expenses 
ADD CONSTRAINT fuel_expenses_payment_period_id_fkey 
FOREIGN KEY (payment_period_id) 
REFERENCES public.company_payment_periods(id);

ALTER TABLE public.expense_instances 
DROP CONSTRAINT IF EXISTS expense_instances_payment_period_id_fkey;

ALTER TABLE public.expense_instances 
ADD CONSTRAINT expense_instances_payment_period_id_fkey 
FOREIGN KEY (payment_period_id) 
REFERENCES public.company_payment_periods(id);

ALTER TABLE public.other_income 
DROP CONSTRAINT IF EXISTS other_income_payment_period_id_fkey;

ALTER TABLE public.other_income 
ADD CONSTRAINT other_income_payment_period_id_fkey 
FOREIGN KEY (payment_period_id) 
REFERENCES public.company_payment_periods(id);

-- 3. Actualizar triggers (eliminar antiguos y crear nuevos)
DROP TRIGGER IF EXISTS trigger_assign_payment_period_on_load_insert ON public.loads;
DROP TRIGGER IF EXISTS trigger_update_payment_period_on_date_change ON public.loads;
DROP TRIGGER IF EXISTS trigger_handle_load_stops_changes ON public.load_stops;

-- Crear nuevos triggers para el modelo de empresa
CREATE TRIGGER trigger_assign_load_to_company_payment_period
    BEFORE INSERT ON public.loads
    FOR EACH ROW
    EXECUTE FUNCTION public.assign_load_to_company_payment_period();

CREATE TRIGGER trigger_update_load_company_payment_period
    BEFORE UPDATE ON public.loads
    FOR EACH ROW
    EXECUTE FUNCTION public.assign_load_to_company_payment_period();

CREATE TRIGGER trigger_handle_load_stops_company_assignment
    AFTER INSERT OR UPDATE OR DELETE ON public.load_stops
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_load_stops_company_assignment();