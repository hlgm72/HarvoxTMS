-- ACID RPCs for Loads: period reassignment and status changes

-- 1) Reassign load to another payment period atomically with validations
CREATE OR REPLACE FUNCTION public.reassign_load_payment_period(
  load_id_param uuid,
  new_period_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  load_rec RECORD;
  old_period_id uuid;
  company_id uuid;
  driver_id uuid;
  is_locked_old boolean;
  is_locked_new boolean;
  old_calc_id uuid;
  new_calc_id uuid;
BEGIN
  -- Auth check
  IF NOT is_authenticated_non_anon() THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  -- Load with company context
  SELECT l.id,
         l.driver_user_id,
         l.payment_period_id AS current_period_id,
         l.status,
         cpp.company_id
  INTO load_rec
  FROM public.loads l
  LEFT JOIN public.company_payment_periods cpp ON l.payment_period_id = cpp.id
  WHERE l.id = load_id_param;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Carga no encontrada';
  END IF;

  company_id := load_rec.company_id;
  driver_id := load_rec.driver_user_id;
  old_period_id := load_rec.current_period_id;

  -- Permission: user must belong to the same company
  IF NOT EXISTS (
    SELECT 1 FROM public.user_company_roles ucr
    WHERE ucr.user_id = auth.uid()
      AND ucr.company_id = company_id
      AND ucr.is_active = true
  ) THEN
    RAISE EXCEPTION 'No tienes permisos para modificar cargas de esta empresa';
  END IF;

  -- Validate new period belongs to same company and is not locked
  IF NOT EXISTS (
    SELECT 1 FROM public.company_payment_periods cpp
    WHERE cpp.id = new_period_id AND cpp.company_id = company_id
  ) THEN
    RAISE EXCEPTION 'El período destino no pertenece a la misma empresa o no existe';
  END IF;

  SELECT is_locked INTO is_locked_new FROM public.company_payment_periods WHERE id = new_period_id;
  IF is_locked_new THEN
    RAISE EXCEPTION 'El período destino está bloqueado';
  END IF;

  -- Validate current period not locked
  SELECT is_locked INTO is_locked_old FROM public.company_payment_periods WHERE id = old_period_id;
  IF is_locked_old THEN
    RAISE EXCEPTION 'El período actual está bloqueado, no se puede reasignar la carga';
  END IF;

  -- Update load to new period
  UPDATE public.loads
  SET payment_period_id = new_period_id,
      updated_at = now()
  WHERE id = load_id_param;

  -- Recalculate old and new driver calculations if they exist
  SELECT id INTO old_calc_id
  FROM public.driver_period_calculations
  WHERE company_payment_period_id = old_period_id
    AND driver_user_id = driver_id
  LIMIT 1;

  IF old_calc_id IS NOT NULL THEN
    PERFORM public.recalculate_payment_period_totals(old_calc_id);
  END IF;

  SELECT id INTO new_calc_id
  FROM public.driver_period_calculations
  WHERE company_payment_period_id = new_period_id
    AND driver_user_id = driver_id
  LIMIT 1;

  IF new_calc_id IS NOT NULL THEN
    PERFORM public.recalculate_payment_period_totals(new_calc_id);
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Carga reasignada de período exitosamente',
    'load_id', load_id_param,
    'old_period_id', old_period_id,
    'new_period_id', new_period_id,
    'old_calculation_id', old_calc_id,
    'new_calculation_id', new_calc_id
  );

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Error en reasignación de período: %', SQLERRM;
END;
$$;


-- 2) Update load status atomically with business validations
CREATE OR REPLACE FUNCTION public.update_load_status_with_validation(
  load_id_param uuid,
  new_status text,
  status_reason text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  load_rec RECORD;
  company_id uuid;
  period_locked boolean;
  old_status text;
  calc_id uuid;
BEGIN
  -- Auth check
  IF NOT is_authenticated_non_anon() THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  -- Fetch load and company context
  SELECT l.id,
         l.driver_user_id,
         l.payment_period_id AS current_period_id,
         l.status,
         cpp.company_id
  INTO load_rec
  FROM public.loads l
  LEFT JOIN public.company_payment_periods cpp ON l.payment_period_id = cpp.id
  WHERE l.id = load_id_param;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Carga no encontrada';
  END IF;

  company_id := load_rec.company_id;
  old_status := load_rec.status;

  -- Permission check
  IF NOT EXISTS (
    SELECT 1 FROM public.user_company_roles ucr
    WHERE ucr.user_id = auth.uid()
      AND ucr.company_id = company_id
      AND ucr.is_active = true
  ) THEN
    RAISE EXCEPTION 'No tienes permisos para modificar cargas de esta empresa';
  END IF;

  -- Period must not be locked
  SELECT is_locked INTO period_locked FROM public.company_payment_periods WHERE id = load_rec.current_period_id;
  IF period_locked THEN
    RAISE EXCEPTION 'El período de la carga está bloqueado';
  END IF;

  -- Basic status validation
  IF new_status NOT IN ('planned','assigned','in_transit','completed','cancelled') THEN
    RAISE EXCEPTION 'Estado de carga inválido: %', new_status;
  END IF;

  IF old_status = 'cancelled' THEN
    RAISE EXCEPTION 'No se puede modificar una carga cancelada';
  END IF;

  IF old_status = 'completed' AND new_status <> 'completed' THEN
    RAISE EXCEPTION 'No se puede revertir una carga completada';
  END IF;

  -- Update status (keep it simple to avoid schema mismatch)
  UPDATE public.loads
  SET status = new_status,
      updated_at = now()
  WHERE id = load_id_param;

  -- Recalculate driver calculation for this period if exists
  SELECT id INTO calc_id
  FROM public.driver_period_calculations dpc
  WHERE dpc.company_payment_period_id = load_rec.current_period_id
    AND dpc.driver_user_id = load_rec.driver_user_id
  LIMIT 1;

  IF calc_id IS NOT NULL THEN
    PERFORM public.recalculate_payment_period_totals(calc_id);
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Estado de carga actualizado',
    'load_id', load_id_param,
    'old_status', old_status,
    'new_status', new_status,
    'calculation_id', calc_id
  );

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Error actualizando estado de carga: %', SQLERRM;
END;
$$;