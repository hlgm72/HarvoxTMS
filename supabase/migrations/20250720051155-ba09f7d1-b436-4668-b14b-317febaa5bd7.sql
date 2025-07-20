-- Finalizar migración: Actualizar triggers y modificar tabla loads

-- 9. Modificar tabla loads para referenciar company_payment_periods
ALTER TABLE public.loads 
DROP CONSTRAINT IF EXISTS loads_payment_period_id_fkey;

ALTER TABLE public.loads 
ADD CONSTRAINT loads_payment_period_id_fkey 
FOREIGN KEY (payment_period_id) 
REFERENCES public.company_payment_periods(id);

-- 10. Actualizar triggers en las tablas
-- Eliminar triggers antiguos
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

-- 11. Actualizar también fuel_expenses, expense_instances y other_income
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

-- 12. Función para calcular totales de un conductor en un período
CREATE OR REPLACE FUNCTION public.calculate_driver_period_totals(
  company_payment_period_id_param UUID,
  driver_user_id_param UUID
)
RETURNS TABLE(
  gross_earnings NUMERIC,
  total_deductions NUMERIC,
  other_income NUMERIC,
  total_income NUMERIC,
  net_payment NUMERIC,
  has_negative_balance BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  load_earnings NUMERIC := 0;
  fuel_costs NUMERIC := 0;
  expense_costs NUMERIC := 0;
  other_income_total NUMERIC := 0;
  calculated_gross NUMERIC := 0;
  calculated_deductions NUMERIC := 0;
  calculated_other_income NUMERIC := 0;
  calculated_total_income NUMERIC := 0;
  calculated_net NUMERIC := 0;
  is_negative BOOLEAN := false;
BEGIN
  -- Calcular ingresos de cargas
  SELECT COALESCE(SUM(total_amount), 0) INTO load_earnings
  FROM public.loads 
  WHERE payment_period_id = company_payment_period_id_param
  AND driver_user_id = driver_user_id_param;
  
  -- Calcular gastos de combustible
  SELECT COALESCE(SUM(total_amount), 0) INTO fuel_costs
  FROM public.fuel_expenses 
  WHERE payment_period_id = company_payment_period_id_param
  AND driver_user_id = driver_user_id_param;
  
  -- Calcular otros gastos
  SELECT COALESCE(SUM(amount), 0) INTO expense_costs
  FROM public.expense_instances 
  WHERE payment_period_id = company_payment_period_id_param;
  
  -- Calcular otros ingresos
  SELECT COALESCE(SUM(amount), 0) INTO other_income_total
  FROM public.other_income 
  WHERE payment_period_id = company_payment_period_id_param
  AND driver_user_id = driver_user_id_param;
  
  -- Calcular totales
  calculated_gross := load_earnings;
  calculated_deductions := fuel_costs + expense_costs;
  calculated_other_income := other_income_total;
  calculated_total_income := calculated_gross + calculated_other_income;
  calculated_net := calculated_total_income - calculated_deductions;
  is_negative := calculated_net < 0;
  
  RETURN QUERY SELECT 
    calculated_gross,
    calculated_deductions,
    calculated_other_income,
    calculated_total_income,
    calculated_net,
    is_negative;
END;
$$;