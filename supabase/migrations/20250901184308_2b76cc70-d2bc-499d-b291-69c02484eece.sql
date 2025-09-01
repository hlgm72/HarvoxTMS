-- Crear función de diagnóstico para encontrar exactamente el error
CREATE OR REPLACE FUNCTION debug_percentage_deduction_creation()
RETURNS JSON 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  test_load_id UUID := 'c41e6977-2b00-4d3e-97c8-6c67126863d1';
  debug_info JSON;
  result_info JSON;
BEGIN
  -- Recopilar información de debug
  SELECT json_build_object(
    'load_exists', EXISTS(SELECT 1 FROM loads WHERE id = test_load_id),
    'load_data', (SELECT json_build_object(
      'id', id,
      'load_number', load_number,
      'driver_user_id', driver_user_id,
      'total_amount', total_amount,
      'dispatching_percentage', dispatching_percentage,
      'factoring_percentage', factoring_percentage,
      'leasing_percentage', leasing_percentage,
      'created_at', created_at
    ) FROM loads WHERE id = test_load_id),
    'owner_operator', (SELECT json_build_object(
      'user_id', user_id,
      'dispatching_percentage', dispatching_percentage,
      'factoring_percentage', factoring_percentage,
      'leasing_percentage', leasing_percentage,
      'is_active', is_active
    ) FROM owner_operators WHERE user_id = '484d83b3-b928-46b3-9705-db225ddb9b0c'),
    'company_id', (SELECT company_id FROM user_company_roles WHERE user_id = '484d83b3-b928-46b3-9705-db225ddb9b0c' AND is_active = true LIMIT 1),
    'period_exists', (SELECT id FROM company_payment_periods WHERE company_id = 'e5d52767-ca59-4c28-94e4-058aff6a037b' AND period_start_date <= '2025-08-27' AND period_end_date >= '2025-08-27' LIMIT 1),
    'calculation_exists', (SELECT dpc.id FROM driver_period_calculations dpc 
      JOIN company_payment_periods cpp ON cpp.id = dpc.company_payment_period_id
      WHERE dpc.driver_user_id = '484d83b3-b928-46b3-9705-db225ddb9b0c' 
        AND cpp.company_id = 'e5d52767-ca59-4c28-94e4-058aff6a037b'
        AND cpp.period_start_date <= '2025-08-27' 
        AND cpp.period_end_date >= '2025-08-27' LIMIT 1),
    'expense_types_exist', json_build_object(
      'dispatching', EXISTS(SELECT 1 FROM expense_types WHERE name = 'Dispatching Fee'),
      'factoring', EXISTS(SELECT 1 FROM expense_types WHERE name = 'Factoring Fee'),
      'leasing', EXISTS(SELECT 1 FROM expense_types WHERE name = 'Leasing Fee')
    )
  ) INTO debug_info;
  
  RETURN debug_info;
END;
$$;

SELECT debug_percentage_deduction_creation() as debug_result;