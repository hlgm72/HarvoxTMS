-- Create ACID RPC to reassign a load to a different company payment period
CREATE OR REPLACE FUNCTION public.reassign_load_payment_period(
  load_id_param uuid,
  target_company_period_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  load_rec RECORD;
  from_cpp_id uuid;
  to_cpp_id uuid := target_company_period_id;
  from_dpc_id uuid;
  to_dpc_id uuid;
  acting_user uuid := auth.uid();
  target_company_id uuid;
  err text;
BEGIN
  -- Authentication check
  IF acting_user IS NULL OR COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  -- Fetch load and its company via current period
  SELECT l.*, cpp.company_id, cpp.id as cpp_id
  INTO load_rec
  FROM loads l
  JOIN company_payment_periods cpp ON cpp.id = l.payment_period_id
  WHERE l.id = load_id_param;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Carga no encontrada';
  END IF;

  target_company_id := load_rec.company_id;

  -- Permission: user must belong to this company
  IF NOT EXISTS (
     SELECT 1 FROM user_company_roles ucr
     WHERE ucr.user_id = acting_user
       AND ucr.company_id = target_company_id
       AND ucr.is_active = true
  ) THEN
     RAISE EXCEPTION 'No tienes permisos en esta empresa';
  END IF;

  -- Validate target period belongs to same company and is not locked
  PERFORM 1
  FROM company_payment_periods cpp2
  WHERE cpp2.id = to_cpp_id
    AND cpp2.company_id = target_company_id
    AND cpp2.is_locked = false;
  IF NOT FOUND THEN
     RAISE EXCEPTION 'Período destino inválido o bloqueado';
  END IF;

  from_cpp_id := load_rec.payment_period_id;

  -- Do not allow moving out of a locked source period
  IF is_period_locked(from_cpp_id) THEN
     RAISE EXCEPTION 'El período origen está bloqueado';
  END IF;

  -- Get driver calculation ids for source and target
  SELECT id INTO from_dpc_id
  FROM driver_period_calculations
  WHERE company_payment_period_id = from_cpp_id
    AND driver_user_id = load_rec.driver_user_id
  LIMIT 1;

  SELECT id INTO to_dpc_id
  FROM driver_period_calculations
  WHERE company_payment_period_id = to_cpp_id
    AND driver_user_id = load_rec.driver_user_id
  LIMIT 1;

  -- Ensure target driver calculation exists
  IF to_dpc_id IS NULL THEN
    INSERT INTO driver_period_calculations (
      company_payment_period_id, driver_user_id,
      gross_earnings, fuel_expenses, total_deductions,
      other_income, total_income, net_payment,
      has_negative_balance, payment_status
    ) VALUES (
      to_cpp_id, load_rec.driver_user_id,
      0, 0, 0, 0, 0, 0, false, 'calculated'
    ) RETURNING id INTO to_dpc_id;
  END IF;

  -- Update the load's period
  UPDATE loads SET payment_period_id = to_cpp_id, updated_at = now()
  WHERE id = load_id_param;

  -- Recalculate both periods for this driver
  IF from_dpc_id IS NOT NULL THEN
    PERFORM recalculate_payment_period_totals(from_dpc_id);
  END IF;
  IF to_dpc_id IS NOT NULL THEN
    PERFORM recalculate_payment_period_totals(to_dpc_id);
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Carga reasignada de período exitosamente',
    'load_id', load_id_param,
    'from_period_id', from_cpp_id,
    'to_period_id', to_cpp_id
  );
EXCEPTION WHEN OTHERS THEN
  err := SQLERRM;
  RETURN jsonb_build_object('success', false, 'message', err);
END;
$$;

-- Create ACID RPC to update load status with validation
CREATE OR REPLACE FUNCTION public.update_load_status_with_validation(
  load_id_param uuid,
  new_status text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  l RECORD;
  acting_user uuid := auth.uid();
  allowed boolean := false;
  from_status text;
  dpc_id uuid;
  err text;
BEGIN
  -- Authentication
  IF acting_user IS NULL OR COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  -- Load and company
  SELECT l.*, cpp.company_id
  INTO l
  FROM loads l
  JOIN company_payment_periods cpp ON cpp.id = l.payment_period_id
  WHERE l.id = load_id_param;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Carga no encontrada';
  END IF;

  -- Permission in company
  IF NOT EXISTS (
     SELECT 1 FROM user_company_roles ucr
     WHERE ucr.user_id = acting_user
       AND ucr.company_id = l.company_id
       AND ucr.is_active = true
  ) THEN
     RAISE EXCEPTION 'No tienes permisos en esta empresa';
  END IF;

  -- Period locked validation
  IF is_period_locked(l.payment_period_id) THEN
    RAISE EXCEPTION 'No se puede cambiar el estado: período bloqueado';
  END IF;

  from_status := l.status;

  -- No-op
  IF from_status = new_status THEN
    RETURN jsonb_build_object('success', true, 'message', 'Sin cambios', 'load_id', load_id_param, 'status', new_status);
  END IF;

  -- Allowed transitions
  IF from_status IN ('draft','open') AND new_status IN ('in_progress','cancelled') THEN
    allowed := true;
  ELSIF from_status = 'in_progress' AND new_status IN ('completed','cancelled') THEN
    allowed := true;
  ELSIF from_status = 'completed' AND new_status IN ('in_progress','cancelled') THEN
    allowed := true;
  ELSIF new_status IN ('draft','open','in_progress','completed','cancelled') THEN
    -- fallback: allow if status is valid
    allowed := true;
  END IF;

  IF NOT allowed THEN
    RAISE EXCEPTION 'Transición de estado no permitida (% -> %)', from_status, new_status;
  END IF;

  -- Update status
  UPDATE loads SET status = new_status, updated_at = now()
  WHERE id = load_id_param;

  -- Recalculate driver period totals for this load's period
  SELECT id INTO dpc_id
  FROM driver_period_calculations
  WHERE company_payment_period_id = l.payment_period_id
    AND driver_user_id = l.driver_user_id
  LIMIT 1;

  IF dpc_id IS NOT NULL THEN
    PERFORM recalculate_payment_period_totals(dpc_id);
  END IF;

  RETURN jsonb_build_object('success', true, 'message', 'Estado actualizado', 'load_id', load_id_param, 'status', new_status);
EXCEPTION WHEN OTHERS THEN
  err := SQLERRM;
  RETURN jsonb_build_object('success', false, 'message', err);
END;
$$;