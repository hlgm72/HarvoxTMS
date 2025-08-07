-- Función ACID para crear gastos de combustible con validación de duplicados
CREATE OR REPLACE FUNCTION public.create_fuel_expense_with_validation(
  expense_data JSONB,
  receipt_file_data JSONB DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_expense_id UUID;
  expense_result RECORD;
  final_result JSONB;
  user_company_id UUID;
  period_id UUID;
  duplicate_count INTEGER;
  txn_date DATE;
BEGIN
  -- Validar autenticación
  IF NOT is_authenticated_non_anon() THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  -- Obtener company_id del usuario
  SELECT company_id INTO user_company_id
  FROM user_company_roles 
  WHERE user_id = auth.uid() AND is_active = true
  LIMIT 1;
  
  IF user_company_id IS NULL THEN
    RAISE EXCEPTION 'No se pudo determinar la empresa del usuario';
  END IF;

  -- Validar que el conductor pertenece a la empresa
  IF NOT EXISTS (
    SELECT 1 FROM user_company_roles 
    WHERE user_id = (expense_data->>'driver_user_id')::UUID 
    AND company_id = user_company_id 
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'El conductor no pertenece a la empresa';
  END IF;

  -- Convertir fecha para validaciones
  txn_date := (expense_data->>'transaction_date')::DATE;

  -- Validar duplicados (buscar transacciones similares)
  SELECT COUNT(*) INTO duplicate_count
  FROM fuel_expenses fe
  JOIN driver_period_calculations dpc ON fe.payment_period_id = dpc.id
  JOIN company_payment_periods cpp ON dpc.company_payment_period_id = cpp.id
  WHERE cpp.company_id = user_company_id
    AND fe.driver_user_id = (expense_data->>'driver_user_id')::UUID
    AND fe.transaction_date::DATE = txn_date
    AND ABS(fe.total_amount - (expense_data->>'total_amount')::NUMERIC) < 0.01
    AND (
      (fe.invoice_number IS NOT NULL AND fe.invoice_number = expense_data->>'invoice_number') OR
      (fe.card_last_five IS NOT NULL AND fe.card_last_five = expense_data->>'card_last_five') OR
      (fe.station_name IS NOT NULL AND fe.station_name = expense_data->>'station_name')
    );

  IF duplicate_count > 0 THEN
    RAISE EXCEPTION 'Esta transacción parece estar duplicada. Ya existe un gasto similar con la misma fecha, monto o detalles.';
  END IF;

  -- Validar o generar período de pago si no se proporciona
  period_id := NULLIF(expense_data->>'payment_period_id', '')::UUID;
  
  IF period_id IS NULL THEN
    -- Buscar período de cálculo del conductor para esta fecha
    SELECT dpc.id INTO period_id
    FROM driver_period_calculations dpc
    JOIN company_payment_periods cpp ON dpc.company_payment_period_id = cpp.id
    WHERE cpp.company_id = user_company_id
      AND dpc.driver_user_id = (expense_data->>'driver_user_id')::UUID
      AND cpp.period_start_date <= txn_date
      AND cpp.period_end_date >= txn_date
      AND NOT cpp.is_locked
    LIMIT 1;
    
    IF period_id IS NULL THEN
      RAISE EXCEPTION 'No se encontró un período de pago válido para la fecha %. Genere períodos de pago primero.', txn_date;
    END IF;
  END IF;

  -- Crear el gasto de combustible
  INSERT INTO public.fuel_expenses (
    driver_user_id,
    payment_period_id,
    transaction_date,
    fuel_type,
    gallons_purchased,
    price_per_gallon,
    total_amount,
    station_name,
    station_state,
    card_last_five,
    vehicle_id,
    receipt_url,
    notes,
    gross_amount,
    discount_amount,
    fees,
    invoice_number,
    status,
    created_by
  ) VALUES (
    (expense_data->>'driver_user_id')::UUID,
    period_id,
    (expense_data->>'transaction_date')::TIMESTAMPTZ,
    COALESCE(expense_data->>'fuel_type', 'diesel'),
    (expense_data->>'gallons_purchased')::NUMERIC,
    (expense_data->>'price_per_gallon')::NUMERIC,
    (expense_data->>'total_amount')::NUMERIC,
    NULLIF(expense_data->>'station_name', ''),
    NULLIF(expense_data->>'station_state', ''),
    NULLIF(expense_data->>'card_last_five', ''),
    NULLIF(expense_data->>'vehicle_id', '')::UUID,
    NULLIF(expense_data->>'receipt_url', ''),
    NULLIF(expense_data->>'notes', ''),
    CASE WHEN expense_data->>'gross_amount' IS NOT NULL AND expense_data->>'gross_amount' != '' 
         THEN (expense_data->>'gross_amount')::NUMERIC 
         ELSE NULL END,
    CASE WHEN expense_data->>'discount_amount' IS NOT NULL AND expense_data->>'discount_amount' != '' 
         THEN (expense_data->>'discount_amount')::NUMERIC 
         ELSE 0 END,
    CASE WHEN expense_data->>'fees' IS NOT NULL AND expense_data->>'fees' != '' 
         THEN (expense_data->>'fees')::NUMERIC 
         ELSE 0 END,
    NULLIF(expense_data->>'invoice_number', ''),
    'pending',
    auth.uid()
  ) RETURNING * INTO expense_result;

  new_expense_id := expense_result.id;

  -- Si hay archivo de recibo, procesarlo (placeholder para futura implementación)
  IF receipt_file_data IS NOT NULL THEN
    -- Aquí se podría implementar la subida del archivo
    -- Por ahora solo loggeamos que se recibió
    RAISE NOTICE 'Receipt file data received for expense %', new_expense_id;
  END IF;

  -- Preparar resultado final
  final_result := jsonb_build_object(
    'expense', row_to_json(expense_result),
    'success', true,
    'message', 'Gasto de combustible creado exitosamente',
    'period_id', period_id
  );

  RETURN final_result;

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Error creando gasto de combustible: %', SQLERRM;
END;
$$;

-- Función ACID para generar períodos de pago de empresa con cálculos automáticos
CREATE OR REPLACE FUNCTION public.generate_company_payment_periods_with_calculations(
  company_id_param UUID,
  from_date_param DATE,
  to_date_param DATE,
  auto_create_driver_calculations BOOLEAN DEFAULT true
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  company_settings RECORD;
  driver_record RECORD;
  period_record RECORD;
  current_period_start DATE;
  current_period_end DATE;
  periods_created INTEGER := 0;
  calculations_created INTEGER := 0;
  frequency_days INTEGER;
  start_day_of_week INTEGER;
  days_to_add INTEGER;
  new_period_id UUID;
BEGIN
  -- Validar autenticación y permisos
  IF NOT is_authenticated_non_anon() THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  -- Validar acceso a la empresa
  IF NOT user_is_admin_in_company(auth.uid(), company_id_param) AND NOT is_superadmin(auth.uid()) THEN
    RAISE EXCEPTION 'No tienes permisos para generar períodos de pago en esta empresa';
  END IF;

  -- Obtener configuración de la empresa
  SELECT 
    default_payment_frequency,
    COALESCE(payment_cycle_start_day, 1) as payment_cycle_start_day
  INTO company_settings
  FROM public.companies 
  WHERE id = company_id_param;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Empresa no encontrada';
  END IF;
  
  -- Determinar días según frecuencia
  CASE company_settings.default_payment_frequency
    WHEN 'weekly' THEN frequency_days := 7;
    WHEN 'biweekly' THEN frequency_days := 14;
    WHEN 'monthly' THEN frequency_days := 30;
    ELSE frequency_days := 7;
  END CASE;
  
  -- Obtener el día de la semana configurado (1=Lunes, 2=Martes, ..., 7=Domingo)
  start_day_of_week := company_settings.payment_cycle_start_day;
  
  -- Calcular la fecha de inicio del primer período basado en el día configurado
  days_to_add := (start_day_of_week - 1 - (EXTRACT(dow FROM from_date_param) + 6) % 7) % 7;
  current_period_start := from_date_param + days_to_add;
  
  -- Si la fecha calculada es posterior a from_date, retroceder una semana
  IF current_period_start > from_date_param THEN
    current_period_start := current_period_start - 7;
  END IF;
  
  -- Generar períodos de empresa
  WHILE current_period_start <= to_date_param LOOP
    current_period_end := current_period_start + (frequency_days - 1);
    
    -- Verificar si ya existe el período
    IF NOT EXISTS (
      SELECT 1 FROM public.company_payment_periods 
      WHERE company_id = company_id_param 
      AND period_start_date = current_period_start
      AND period_end_date = current_period_end
    ) THEN
      -- Crear el período de empresa
      INSERT INTO public.company_payment_periods (
        company_id,
        period_start_date,
        period_end_date,
        period_frequency,
        period_type,
        status
      ) VALUES (
        company_id_param,
        current_period_start,
        current_period_end,
        company_settings.default_payment_frequency,
        'regular',
        'open'
      ) RETURNING id INTO new_period_id;
      
      periods_created := periods_created + 1;
      
      -- Auto-crear cálculos de conductores si está habilitado
      IF auto_create_driver_calculations THEN
        FOR driver_record IN 
          SELECT ucr.user_id
          FROM user_company_roles ucr
          WHERE ucr.company_id = company_id_param 
            AND ucr.role = 'driver' 
            AND ucr.is_active = true
        LOOP
          INSERT INTO driver_period_calculations (
            company_payment_period_id,
            driver_user_id,
            gross_earnings,
            fuel_expenses,
            total_deductions,
            other_income,
            total_income,
            net_payment,
            has_negative_balance,
            payment_status
          ) VALUES (
            new_period_id,
            driver_record.user_id,
            0, 0, 0, 0, 0, 0, false,
            'calculated'
          )
          ON CONFLICT (company_payment_period_id, driver_user_id) DO NOTHING;
          
          calculations_created := calculations_created + 1;
        END LOOP;
      END IF;
    END IF;
    
    current_period_start := current_period_start + frequency_days;
  END LOOP;
  
  -- Generar gastos recurrentes para todos los períodos creados
  IF periods_created > 0 THEN
    FOR period_record IN
      SELECT id FROM public.company_payment_periods 
      WHERE company_id = company_id_param 
      AND period_start_date >= from_date_param 
      AND period_end_date <= to_date_param
    LOOP
      PERFORM generate_recurring_expenses_for_period(period_record.id);
    END LOOP;
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'periods_created', periods_created,
    'calculations_created', calculations_created,
    'message', format('Se crearon %s períodos de pago con %s cálculos de conductores', 
                     periods_created, calculations_created)
  );
END;
$$;