-- Probar la función con un período específico
SELECT generate_recurring_expenses_for_period('344d35bd-3858-4e19-ac7c-f223d02fa7e3'::uuid) as test_result;

-- Si funciona, aplicar a todos los períodos abiertos
DO $$
DECLARE
  period_record RECORD;
  result_json JSONB;
BEGIN
  FOR period_record IN 
    SELECT id, period_start_date, period_end_date
    FROM company_payment_periods 
    WHERE status = 'open'
    ORDER BY period_start_date ASC
  LOOP
    SELECT generate_recurring_expenses_for_period(period_record.id) INTO result_json;
    RAISE NOTICE 'Generated recurring expenses for period % (% to %): %', 
      period_record.id, 
      period_record.period_start_date, 
      period_record.period_end_date, 
      result_json;
  END LOOP;
END $$;