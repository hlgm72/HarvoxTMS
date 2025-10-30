-- Corregir get_or_create_payment_period
-- La tabla driver_period_calculations no existe, usar solo company_payment_periods

CREATE OR REPLACE FUNCTION get_or_create_payment_period(
  driver_user_id_param UUID,
  target_date DATE,
  company_id_param UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment_period_id UUID;
BEGIN
  -- Buscar el período de pago de la compañía que incluye la fecha
  SELECT id INTO v_payment_period_id
  FROM company_payment_periods
  WHERE company_id = company_id_param
    AND period_start_date <= target_date
    AND period_end_date >= target_date
  LIMIT 1;

  -- Si no existe, crearlo usando la función existente
  IF v_payment_period_id IS NULL THEN
    SELECT create_payment_period_if_needed(
      company_id_param,
      target_date,
      auth.uid()
    ) INTO v_payment_period_id;
  END IF;

  RETURN v_payment_period_id;

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error en get_or_create_payment_period: %', SQLERRM;
END;
$$;