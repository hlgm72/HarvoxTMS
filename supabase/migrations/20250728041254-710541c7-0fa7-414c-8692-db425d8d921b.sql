-- Verificar que el trigger auto_recalculate_driver_period_totals se esté ejecutando correctamente
-- Forzar recálculo manual para el registro existente

-- Primero obtener el company_payment_period_id para el registro de other_income existente
DO $$
DECLARE
  calc_id UUID;
  income_driver_id UUID := '087a825c-94ea-42d9-8388-5087a19d776f';
  income_period_id UUID := '6109b35c-ca0e-4eff-9655-ddc614818ab5';
  total_other_income NUMERIC := 0;
BEGIN
  -- Obtener el ID del cálculo del conductor para este período
  SELECT id INTO calc_id
  FROM driver_period_calculations dpc
  WHERE dpc.company_payment_period_id = income_period_id
  AND dpc.driver_user_id = income_driver_id;
  
  -- Si no existe, crearlo
  IF calc_id IS NULL THEN
    INSERT INTO driver_period_calculations (
      company_payment_period_id,
      driver_user_id,
      gross_earnings,
      total_deductions,
      other_income,
      fuel_expenses,
      has_negative_balance
    ) VALUES (
      income_period_id,
      income_driver_id,
      0, 0, 0, 0, false
    )
    RETURNING id INTO calc_id;
  END IF;
  
  -- Calcular el total de otros ingresos aprobados para este conductor y período
  SELECT COALESCE(SUM(oi.amount), 0) INTO total_other_income
  FROM other_income oi
  WHERE oi.driver_user_id = income_driver_id
  AND oi.payment_period_id = income_period_id
  AND oi.status = 'approved';
  
  -- Actualizar el cálculo del conductor
  UPDATE driver_period_calculations 
  SET 
    other_income = total_other_income,
    updated_at = now()
  WHERE id = calc_id;
  
  RAISE NOTICE 'Updated driver calculation % with other_income: %', calc_id, total_other_income;
END $$;