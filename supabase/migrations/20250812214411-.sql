-- Clean up legacy triggers/functions that may cause ambiguous net_payment errors during load updates
-- 1) Drop old recalc triggers on loads (if they still exist)
DROP TRIGGER IF EXISTS auto_recalc_on_loads ON public.loads;
DROP TRIGGER IF EXISTS auto_recalc_loads ON public.loads;
DROP TRIGGER IF EXISTS trigger_auto_recalc_loads ON public.loads;
DROP TRIGGER IF EXISTS auto_recalculate_on_loads_trigger ON public.loads;

-- Keep the current consolidated triggers created on 2025-08-12 (trg_recalc_driver_period_after_load_*)
-- and the deductions triggers. We only remove legacy ones above.

-- 2) Drop legacy helper functions that could be referenced by the old triggers
DROP FUNCTION IF EXISTS public.auto_recalculate_driver_period_totals() CASCADE;
DROP FUNCTION IF EXISTS public.calculate_driver_period_totals(driver_calc_id uuid) CASCADE;

-- 3) Ensure the latest calculate_driver_payment_period exists (recreate idempotently)
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

  SELECT * INTO totals
  FROM public.calculate_driver_period_totals(calc.company_payment_period_id, calc.driver_user_id);

  net_payment := (COALESCE(totals.gross_earnings,0) + COALESCE(totals.other_income,0))
                 - COALESCE(totals.fuel_expenses,0) - COALESCE(totals.total_deductions,0);

  UPDATE public.driver_period_calculations
  SET gross_earnings = COALESCE(totals.gross_earnings,0),
      fuel_expenses = COALESCE(totals.fuel_expenses,0),
      total_deductions = COALESCE(totals.total_deductions,0),
      other_income = COALESCE(totals.other_income,0),
      net_payment = net_payment,
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