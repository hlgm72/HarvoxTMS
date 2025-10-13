-- Agregar seguridad al VIEW de compatibilidad driver_period_calculations
-- El VIEW hereda las políticas RLS de user_payrolls subyacente

-- No podemos habilitar RLS directamente en un VIEW, pero podemos usar
-- SECURITY INVOKER en lugar de SECURITY DEFINER para que use los permisos del usuario que consulta
DROP VIEW IF EXISTS public.driver_period_calculations;

CREATE OR REPLACE VIEW public.driver_period_calculations 
WITH (security_invoker = true) AS
SELECT 
  id,
  company_payment_period_id,
  user_id as driver_user_id,
  gross_earnings,
  fuel_expenses,
  total_deductions,
  other_income,
  net_payment,
  has_negative_balance,
  payment_status,
  payment_method,
  payment_reference,
  payment_notes,
  calculated_by,
  created_at,
  updated_at
FROM public.user_payrolls;

COMMENT ON VIEW public.driver_period_calculations IS 
'VIEW de compatibilidad con SECURITY INVOKER que redirige a user_payrolls. Usa los permisos del usuario consultante.';