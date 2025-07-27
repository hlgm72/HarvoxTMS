-- Aplicar la generación de deducciones recurrentes a todos los períodos existentes
DO $$
DECLARE
  period_record RECORD;
  result_json JSONB;
BEGIN
  -- Para cada período de pago existente que esté abierto
  FOR period_record IN 
    SELECT id, period_start_date, period_end_date
    FROM company_payment_periods 
    WHERE status = 'open'
    ORDER BY period_start_date ASC
  LOOP
    -- Generar deducciones recurrentes para este período
    SELECT generate_recurring_expenses_for_period(period_record.id) INTO result_json;
    
    -- Log del resultado
    RAISE NOTICE 'Generated recurring expenses for existing period % (% to %): %', 
      period_record.id, 
      period_record.period_start_date, 
      period_record.period_end_date, 
      result_json;
  END LOOP;
  
  RAISE NOTICE 'Completed generating recurring expenses for all existing periods';
END $$;