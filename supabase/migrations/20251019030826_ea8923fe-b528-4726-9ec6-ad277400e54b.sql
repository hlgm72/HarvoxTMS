
-- 🔥 ELIMINAR COMPLETAMENTE LA VISTA OBSOLETA driver_period_calculations
-- Esta vista está causando conflictos porque referencia columnas que ya no existen

-- Primero eliminar cualquier dependencia
DROP VIEW IF EXISTS driver_period_calculations CASCADE;

-- Crear función auxiliar para migración gradual si es necesaria
CREATE OR REPLACE FUNCTION get_user_payment_calculation(calc_id uuid)
RETURNS TABLE (
  id uuid,
  company_payment_period_id uuid,
  driver_user_id uuid,
  gross_earnings numeric,
  fuel_expenses numeric,
  total_deductions numeric,
  other_income numeric,
  net_payment numeric,
  has_negative_balance boolean,
  calculated_by uuid,
  created_at timestamptz,
  updated_at timestamptz,
  payment_status text,
  payment_method text,
  payment_reference text,
  payment_notes text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    up.id,
    up.company_payment_period_id,
    up.user_id as driver_user_id,
    up.gross_earnings,
    up.fuel_expenses,
    up.total_deductions,
    up.other_income,
    up.net_payment,
    up.has_negative_balance,
    up.calculated_by,
    up.created_at,
    up.updated_at,
    up.payment_status,
    up.payment_method,
    up.payment_reference,
    up.payment_notes
  FROM user_payrolls up
  WHERE up.id = calc_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
