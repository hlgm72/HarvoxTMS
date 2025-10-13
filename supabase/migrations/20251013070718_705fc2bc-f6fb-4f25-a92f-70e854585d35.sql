-- Crear VIEW de compatibilidad para driver_period_calculations apuntando a user_payrolls
-- Esto permite que todo el código antiguo siga funcionando sin necesidad de actualizar
-- cientos de funciones y triggers existentes

CREATE OR REPLACE VIEW public.driver_period_calculations AS
SELECT 
  id,
  company_payment_period_id,
  user_id as driver_user_id, -- Mapear user_id a driver_user_id
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

-- Comentario explicativo
COMMENT ON VIEW public.driver_period_calculations IS 
'VIEW de compatibilidad que redirige a user_payrolls. Mantiene la compatibilidad con código legacy que aún referencia driver_period_calculations.';