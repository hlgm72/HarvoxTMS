-- Fix driver period totals to include all loads within the period window and auto-recalculate on load changes
-- SECURITY: Use SECURITY DEFINER and keep search_path to public

-- 1) Helper: calculate totals for a driver+period combining mapped loads and date-range loads
CREATE OR REPLACE FUNCTION public.calculate_driver_period_totals(
  company_payment_period_id_param uuid,
  driver_user_id_param uuid
)
RETURNS TABLE (
  gross_earnings numeric,
  fuel_expenses numeric,
  total_deductions numeric,
  other_income numeric
) AS $$
DECLARE
  period_start date;
  period_end date;
  company_id uuid;
BEGIN
  -- Get period data
  SELECT cpp.period_start_date, cpp.period_end_date, cpp.company_id
  INTO period_start, period_end, company_id
  FROM public.company_payment_periods cpp
  WHERE cpp.id = company_payment_period_id_param;

  IF company_id IS NULL THEN
    RETURN QUERY SELECT 0::numeric, 0::numeric, 0::numeric, 0::numeric;
    RETURN;
  END IF;

  -- Gross earnings: sum loads for the driver in the same company, either explicitly assigned to this period
  -- or whose delivery_date falls within the period date range
  RETURN QUERY WITH 
  gross AS (
    SELECT COALESCE(SUM(l.total_amount), 0)::numeric AS val
    FROM public.loads l
    WHERE l.driver_user_id = driver_user_id_param
      AND (l.company_id = company_id OR l.company_id IS NULL) -- allow when null to avoid missing data
      AND (
        l.payment_period_id = company_payment_period_id_param OR
        (l.delivery_date::date BETWEEN period_start AND period_end)
      )
  ),
  fuel AS (
    -- Fuel expenses are recorded against the company payment period
    SELECT COALESCE(SUM(fe.total_amount), 0)::numeric AS val
    FROM public.fuel_expenses fe
    WHERE fe.driver_user_id = driver_user_id_param
      AND fe.payment_period_id = company_payment_period_id_param
  ),
  deductions AS (
    -- Eventual/recurring deductions are recorded against driver_period_calculations (payment_period_id -> dpc.id)
    SELECT COALESCE(SUM(ei.amount), 0)::numeric AS val
    FROM public.expense_instances ei
    WHERE ei.user_id = driver_user_id_param
      AND ei.payment_period_id IN (
        SELECT dpc.id
        FROM public.driver_period_calculations dpc
        WHERE dpc.company_payment_period_id = company_payment_period_id_param
          AND dpc.driver_user_id = driver_user_id_param
      )
      AND COALESCE(ei.status, 'applied') <> 'void'
  ),
  oi AS (
    -- Other income is recorded against the company payment period
    SELECT COALESCE(SUM(oi.amount), 0)::numeric AS val
    FROM public.other_income oi
    WHERE oi.user_id = driver_user_id_param
      AND oi.payment_period_id = company_payment_period_id_param
      AND COALESCE(oi.status, 'approved') = 'approved'
  )
  SELECT gross.val, fuel.val, deductions.val, oi.val
  FROM gross, fuel, deductions, oi;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO public;


-- 2) Core calculation: update the driver calculation row with totals
CREATE OR REPLACE FUNCTION public.calculate_driver_payment_period(
  period_calculation_id uuid
)
RETURNS jsonb AS $$
DECLARE
  calc RECORD;
  totals RECORD;
  net_payment numeric;
BEGIN
  SELECT * INTO calc
  FROM public.driver_period_calculations
  WHERE id = period_calculation_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Cálculo no encontrado');
  END IF;

  -- Compute totals using helper
  SELECT * INTO totals
  FROM public.calculate_driver_period_totals(calc.company_payment_period_id, calc.driver_user_id);

  net_payment := (COALESCE(totals.gross_earnings,0) + COALESCE(totals.other_income,0))
                 - COALESCE(totals.fuel_expenses,0) - COALESCE(totals.total_deductions,0);

  UPDATE public.driver_period_calculations
  SET gross_earnings = COALESCE(totals.gross_earnings,0),
      fuel_expenses = COALESCE(totals.fuel_expenses,0),
      total_deductions = COALESCE(totals.total_deductions,0),
      other_income = COALESCE(totals.other_income,0),
      has_negative_balance = (net_payment < 0),
      calculated_at = now(),
      updated_at = now()
  WHERE id = period_calculation_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Cálculo actualizado',
    'calculation_id', period_calculation_id,
    'totals', jsonb_build_object(
      'gross_earnings', COALESCE(totals.gross_earnings,0),
      'fuel_expenses', COALESCE(totals.fuel_expenses,0),
      'total_deductions', COALESCE(totals.total_deductions,0),
      'other_income', COALESCE(totals.other_income,0),
      'net_payment', net_payment
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO public;


-- 3) Validation wrapper to respect locked periods
CREATE OR REPLACE FUNCTION public.calculate_driver_payment_period_with_validation(
  calculation_id uuid
)
RETURNS jsonb AS $$
DECLARE
  calc RECORD;
  period_locked boolean;
  result jsonb;
BEGIN
  SELECT * INTO calc
  FROM public.driver_period_calculations
  WHERE id = calculation_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Cálculo no encontrado');
  END IF;

  SELECT COALESCE(is_locked, false) INTO period_locked
  FROM public.company_payment_periods
  WHERE id = calc.company_payment_period_id;

  IF period_locked THEN
    RETURN jsonb_build_object('success', false, 'message', 'El período está bloqueado');
  END IF;

  SELECT public.calculate_driver_payment_period(calculation_id) INTO result;
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO public;


-- 4) Trigger: When loads change, recalculate affected driver period(s)
CREATE OR REPLACE FUNCTION public.trigger_recalc_driver_period_after_load()
RETURNS trigger AS $$
DECLARE
  old_period_id uuid;
  new_period_id uuid;
  old_driver uuid;
  new_driver uuid;
  dpc_id uuid;
BEGIN
  IF (TG_OP = 'DELETE') THEN
    old_driver := OLD.driver_user_id;

    SELECT cpp.id INTO old_period_id
    FROM public.company_payment_periods cpp
    WHERE cpp.company_id = OLD.company_id
      AND OLD.delivery_date::date BETWEEN cpp.period_start_date AND cpp.period_end_date
    LIMIT 1;

    IF old_period_id IS NOT NULL AND old_driver IS NOT NULL THEN
      SELECT id INTO dpc_id
      FROM public.driver_period_calculations
      WHERE company_payment_period_id = old_period_id
        AND driver_user_id = old_driver
      LIMIT 1;

      IF dpc_id IS NOT NULL THEN
        PERFORM public.calculate_driver_payment_period(dpc_id);
      END IF;
    END IF;

    RETURN OLD;
  END IF;

  -- INSERT or UPDATE
  new_driver := NEW.driver_user_id;

  SELECT cpp.id INTO new_period_id
  FROM public.company_payment_periods cpp
  WHERE cpp.company_id = NEW.company_id
    AND NEW.delivery_date::date BETWEEN cpp.period_start_date AND cpp.period_end_date
  LIMIT 1;

  -- Ensure DPC exists for new
  IF new_period_id IS NOT NULL AND new_driver IS NOT NULL THEN
    SELECT id INTO dpc_id
    FROM public.driver_period_calculations
    WHERE company_payment_period_id = new_period_id
      AND driver_user_id = new_driver
    LIMIT 1;

    IF dpc_id IS NULL THEN
      INSERT INTO public.driver_period_calculations (
        company_payment_period_id,
        driver_user_id,
        gross_earnings,
        fuel_expenses,
        total_deductions,
        other_income,
        has_negative_balance,
        created_at,
        updated_at
      ) VALUES (
        new_period_id,
        new_driver,
        0, 0, 0, 0,
        false,
        now(),
        now()
      ) RETURNING id INTO dpc_id;
    END IF;

    PERFORM public.calculate_driver_payment_period(dpc_id);
  END IF;

  -- If UPDATE, also recompute old mapping if period/driver changed
  IF (TG_OP = 'UPDATE') THEN
    old_driver := OLD.driver_user_id;

    SELECT cpp.id INTO old_period_id
    FROM public.company_payment_periods cpp
    WHERE cpp.company_id = OLD.company_id
      AND OLD.delivery_date::date BETWEEN cpp.period_start_date AND cpp.period_end_date
    LIMIT 1;

    IF (old_period_id IS NOT NULL AND old_driver IS NOT NULL) AND (old_period_id <> new_period_id OR old_driver <> new_driver) THEN
      SELECT id INTO dpc_id
      FROM public.driver_period_calculations
      WHERE company_payment_period_id = old_period_id
        AND driver_user_id = old_driver
      LIMIT 1;

      IF dpc_id IS NOT NULL THEN
        PERFORM public.calculate_driver_payment_period(dpc_id);
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO public;

-- Drop existing triggers if any to avoid duplicates
DROP TRIGGER IF EXISTS trg_recalc_driver_period_after_load_insupd ON public.loads;
DROP TRIGGER IF EXISTS trg_recalc_driver_period_after_load_del ON public.loads;

-- Create triggers
CREATE TRIGGER trg_recalc_driver_period_after_load_insupd
AFTER INSERT OR UPDATE OF driver_user_id, delivery_date, total_amount, payment_period_id, company_id ON public.loads
FOR EACH ROW EXECUTE FUNCTION public.trigger_recalc_driver_period_after_load();

CREATE TRIGGER trg_recalc_driver_period_after_load_del
AFTER DELETE ON public.loads
FOR EACH ROW EXECUTE FUNCTION public.trigger_recalc_driver_period_after_load();