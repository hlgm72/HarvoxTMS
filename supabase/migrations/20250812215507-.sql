-- Fix ambiguous column reference caused by variable shadowing in calculate_driver_payment_period
CREATE OR REPLACE FUNCTION public.calculate_driver_payment_period(
  period_calculation_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  calc RECORD;
  totals RECORD;
  v_net_payment numeric;
BEGIN
  SELECT * INTO calc
  FROM public.driver_period_calculations
  WHERE id = period_calculation_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Cálculo no encontrado');
  END IF;

  -- Uses existing aggregate function that returns totals for this period/driver
  SELECT * INTO totals
  FROM public.calculate_driver_period_totals(calc.company_payment_period_id, calc.driver_user_id);

  v_net_payment := (COALESCE(totals.gross_earnings,0) + COALESCE(totals.other_income,0))
                   - COALESCE(totals.fuel_expenses,0) - COALESCE(totals.total_deductions,0);

  UPDATE public.driver_period_calculations
  SET gross_earnings = COALESCE(totals.gross_earnings,0),
      fuel_expenses = COALESCE(totals.fuel_expenses,0),
      total_deductions = COALESCE(totals.total_deductions,0),
      other_income = COALESCE(totals.other_income,0),
      net_payment = v_net_payment,
      has_negative_balance = (v_net_payment < 0),
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
      'net_payment', v_net_payment
    )
  );
END;
$$;