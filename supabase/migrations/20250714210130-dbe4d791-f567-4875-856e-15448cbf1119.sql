-- Función para reasignar elementos manualmente a diferentes períodos
CREATE OR REPLACE FUNCTION public.reassign_to_payment_period(
  element_type TEXT, -- 'load', 'fuel_expense', 'expense_instance', 'other_income'
  element_id UUID,
  new_period_id UUID,
  reassigned_by UUID DEFAULT auth.uid()
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  current_period_record RECORD;
  new_period_record RECORD;
  element_record RECORD;
  result JSONB;
BEGIN
  -- Verificar que el usuario tenga permisos (company owner, operations manager, etc.)
  IF NOT EXISTS (
    SELECT 1 FROM public.user_company_roles ucr
    WHERE ucr.user_id = reassigned_by 
    AND ucr.role IN ('company_owner', 'operations_manager', 'dispatcher')
    AND ucr.is_active = true
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'No tienes permisos para reasignar elementos'
    );
  END IF;
  
  -- Obtener información del nuevo período
  SELECT * INTO new_period_record 
  FROM public.payment_periods 
  WHERE id = new_period_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Período de destino no encontrado'
    );
  END IF;
  
  -- Verificar que el nuevo período no esté bloqueado
  IF new_period_record.is_locked THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'No se puede asignar a un período bloqueado'
    );
  END IF;
  
  -- Procesar según el tipo de elemento
  CASE element_type
    WHEN 'load' THEN
      -- Verificar que existe la carga
      SELECT * INTO element_record FROM public.loads WHERE id = element_id;
      IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Carga no encontrada');
      END IF;
      
      -- Verificar que la carga pertenece al mismo conductor del período
      IF element_record.driver_user_id != new_period_record.driver_user_id THEN
        RETURN jsonb_build_object('success', false, 'message', 'La carga no pertenece al conductor del período');
      END IF;
      
      -- Verificar que el período actual no esté bloqueado
      IF element_record.payment_period_id IS NOT NULL THEN
        SELECT is_locked INTO current_period_record 
        FROM public.payment_periods 
        WHERE id = element_record.payment_period_id;
        
        IF FOUND AND current_period_record.is_locked THEN
          RETURN jsonb_build_object('success', false, 'message', 'No se puede mover desde un período bloqueado');
        END IF;
      END IF;
      
      -- Reasignar la carga
      UPDATE public.loads 
      SET payment_period_id = new_period_id,
          updated_at = now()
      WHERE id = element_id;
      
    WHEN 'fuel_expense' THEN
      SELECT * INTO element_record FROM public.fuel_expenses WHERE id = element_id;
      IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Gasto de combustible no encontrado');
      END IF;
      
      IF element_record.driver_user_id != new_period_record.driver_user_id THEN
        RETURN jsonb_build_object('success', false, 'message', 'El gasto no pertenece al conductor del período');
      END IF;
      
      -- Verificar período actual
      SELECT is_locked INTO current_period_record 
      FROM public.payment_periods 
      WHERE id = element_record.payment_period_id;
      
      IF FOUND AND current_period_record.is_locked THEN
        RETURN jsonb_build_object('success', false, 'message', 'No se puede mover desde un período bloqueado');
      END IF;
      
      UPDATE public.fuel_expenses 
      SET payment_period_id = new_period_id,
          updated_at = now()
      WHERE id = element_id;
      
    WHEN 'expense_instance' THEN
      SELECT * INTO element_record FROM public.expense_instances WHERE id = element_id;
      IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Instancia de gasto no encontrada');
      END IF;
      
      -- Verificar período actual
      SELECT is_locked INTO current_period_record 
      FROM public.payment_periods 
      WHERE id = element_record.payment_period_id;
      
      IF FOUND AND current_period_record.is_locked THEN
        RETURN jsonb_build_object('success', false, 'message', 'No se puede mover desde un período bloqueado');
      END IF;
      
      UPDATE public.expense_instances 
      SET payment_period_id = new_period_id,
          updated_at = now()
      WHERE id = element_id;
      
    WHEN 'other_income' THEN
      SELECT * INTO element_record FROM public.other_income WHERE id = element_id;
      IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Otro ingreso no encontrado');
      END IF;
      
      IF element_record.driver_user_id != new_period_record.driver_user_id THEN
        RETURN jsonb_build_object('success', false, 'message', 'El ingreso no pertenece al conductor del período');
      END IF;
      
      -- Verificar período actual
      SELECT is_locked INTO current_period_record 
      FROM public.payment_periods 
      WHERE id = element_record.payment_period_id;
      
      IF FOUND AND current_period_record.is_locked THEN
        RETURN jsonb_build_object('success', false, 'message', 'No se puede mover desde un período bloqueado');
      END IF;
      
      UPDATE public.other_income 
      SET payment_period_id = new_period_id,
          updated_at = now()
      WHERE id = element_id;
      
    ELSE
      RETURN jsonb_build_object('success', false, 'message', 'Tipo de elemento no válido');
  END CASE;
  
  -- Registrar la reasignación en el log del sistema
  INSERT INTO public.system_stats (stat_type, stat_value)
  VALUES ('payment_period_reassignment', jsonb_build_object(
    'element_type', element_type,
    'element_id', element_id,
    'old_period_id', CASE WHEN element_type = 'load' THEN element_record.payment_period_id ELSE NULL END,
    'new_period_id', new_period_id,
    'reassigned_by', reassigned_by,
    'reassigned_at', now(),
    'reason', 'manual_reassignment'
  ));
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Elemento reasignado exitosamente',
    'element_type', element_type,
    'element_id', element_id,
    'new_period_id', new_period_id
  );
END;
$$;

-- Función para obtener elementos asignados a un período específico
CREATE OR REPLACE FUNCTION public.get_payment_period_elements(period_id_param UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  result JSONB;
  loads_data JSONB;
  fuel_expenses_data JSONB;
  expense_instances_data JSONB;
  other_income_data JSONB;
BEGIN
  -- Obtener cargas
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', l.id,
      'load_number', l.load_number,
      'total_amount', l.total_amount,
      'pickup_date', l.pickup_date,
      'delivery_date', l.delivery_date,
      'status', l.status,
      'commodity', l.commodity,
      'broker_name', cb.name
    )
  ) INTO loads_data
  FROM public.loads l
  LEFT JOIN public.company_brokers cb ON l.broker_id = cb.id
  WHERE l.payment_period_id = period_id_param;
  
  -- Obtener gastos de combustible
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', fe.id,
      'total_amount', fe.total_amount,
      'gallons_purchased', fe.gallons_purchased,
      'transaction_date', fe.transaction_date,
      'station_name', fe.station_name,
      'status', fe.status
    )
  ) INTO fuel_expenses_data
  FROM public.fuel_expenses fe
  WHERE fe.payment_period_id = period_id_param;
  
  -- Obtener instancias de gastos
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', ei.id,
      'amount', ei.amount,
      'description', ei.description,
      'expense_date', ei.expense_date,
      'status', ei.status,
      'is_critical', ei.is_critical,
      'expense_type_name', et.name
    )
  ) INTO expense_instances_data
  FROM public.expense_instances ei
  LEFT JOIN public.expense_types et ON ei.expense_type_id = et.id
  WHERE ei.payment_period_id = period_id_param;
  
  -- Obtener otros ingresos
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', oi.id,
      'amount', oi.amount,
      'description', oi.description,
      'income_date', oi.income_date,
      'income_type', oi.income_type,
      'status', oi.status
    )
  ) INTO other_income_data
  FROM public.other_income oi
  WHERE oi.payment_period_id = period_id_param;
  
  -- Construir resultado final
  SELECT jsonb_build_object(
    'period_id', period_id_param,
    'loads', COALESCE(loads_data, '[]'::jsonb),
    'fuel_expenses', COALESCE(fuel_expenses_data, '[]'::jsonb),
    'expense_instances', COALESCE(expense_instances_data, '[]'::jsonb),
    'other_income', COALESCE(other_income_data, '[]'::jsonb)
  ) INTO result;
  
  RETURN result;
END;
$$;