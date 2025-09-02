-- Clean up the unwanted week 36 period that was created
DO $$
DECLARE
  week36_period_id UUID;
  deleted_calculations INTEGER := 0;
  deleted_expenses INTEGER := 0;
BEGIN
  -- Find week 36 period
  SELECT id INTO week36_period_id
  FROM company_payment_periods 
  WHERE EXTRACT(WEEK FROM period_start_date) = 36 
  AND EXTRACT(YEAR FROM period_start_date) = 2025
  AND company_id = 'e5d52767-ca59-4c28-94e4-058aff6a037b'
  LIMIT 1;

  IF week36_period_id IS NOT NULL THEN
    RAISE LOG 'Cleaning up unwanted week 36 period: %', week36_period_id;

    -- Delete expense instances for this period
    DELETE FROM expense_instances
    WHERE payment_period_id IN (
      SELECT id FROM driver_period_calculations
      WHERE company_payment_period_id = week36_period_id
    );
    
    GET DIAGNOSTICS deleted_expenses = ROW_COUNT;
    RAISE LOG 'Deleted % expense instances', deleted_expenses;

    -- Delete driver calculations
    DELETE FROM driver_period_calculations
    WHERE company_payment_period_id = week36_period_id;
    
    GET DIAGNOSTICS deleted_calculations = ROW_COUNT;
    RAISE LOG 'Deleted % driver calculations', deleted_calculations;

    -- Delete the period itself
    DELETE FROM company_payment_periods
    WHERE id = week36_period_id;
    
    RAISE LOG 'Week 36 period cleaned up successfully';
  ELSE
    RAISE LOG 'Week 36 period not found or already deleted';
  END IF;
END $$;