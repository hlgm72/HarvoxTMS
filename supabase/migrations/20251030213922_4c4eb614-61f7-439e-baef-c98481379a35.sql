-- Crear función get_or_create_payment_period que faltaba
-- Esta función obtiene o crea un período de pago para un conductor

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
  v_company_period_id UUID;
BEGIN
  -- Primero, asegurar que existe el período de la compañía
  SELECT id INTO v_company_period_id
  FROM company_payment_periods
  WHERE company_id = company_id_param
    AND period_start_date <= target_date
    AND period_end_date >= target_date
  LIMIT 1;

  -- Si no existe el período de la compañía, crearlo
  IF v_company_period_id IS NULL THEN
    SELECT create_payment_period_if_needed(
      company_id_param,
      target_date,
      auth.uid()
    ) INTO v_company_period_id;
  END IF;

  -- Ahora buscar o crear el período del conductor
  SELECT id INTO v_payment_period_id
  FROM driver_period_calculations
  WHERE driver_user_id = driver_user_id_param
    AND payment_period_id = v_company_period_id
  LIMIT 1;

  -- Si no existe, crearlo
  IF v_payment_period_id IS NULL THEN
    INSERT INTO driver_period_calculations (
      driver_user_id,
      payment_period_id,
      gross_earnings,
      other_income,
      fuel_expenses,
      total_deductions,
      net_payment,
      has_negative_balance,
      calculation_status
    ) VALUES (
      driver_user_id_param,
      v_company_period_id,
      0,
      0,
      0,
      0,
      0,
      false,
      'pending'
    )
    RETURNING payment_period_id INTO v_payment_period_id;
  ELSE
    v_payment_period_id := v_company_period_id;
  END IF;

  RETURN v_payment_period_id;

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error en get_or_create_payment_period: %', SQLERRM;
END;
$$;