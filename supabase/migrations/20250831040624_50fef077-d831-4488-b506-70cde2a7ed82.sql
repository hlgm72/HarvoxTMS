-- Corregir las funciones que referencian la tabla inexistente "payment_periods"
-- El error es que están usando "payment_periods" en lugar de "company_payment_periods"

-- 1. Corregir la función create_percentage_deductions_for_load
CREATE OR REPLACE FUNCTION public.create_percentage_deductions_for_load(
  load_id_param uuid,
  driver_user_id_param uuid,
  payment_period_id_param uuid,
  load_amount_param numeric,
  leasing_pct_param numeric,
  factoring_pct_param numeric,
  dispatching_pct_param numeric,
  load_number_param text,
  created_by_param uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  leasing_expense_type_id uuid;
  factoring_expense_type_id uuid;
  dispatching_expense_type_id uuid;
  dpc_id uuid;
  deduction_amount numeric;
BEGIN
  -- Obtener IDs de tipos de expense
  SELECT id INTO leasing_expense_type_id FROM expense_types WHERE name = 'Leasing Fee' LIMIT 1;
  SELECT id INTO factoring_expense_type_id FROM expense_types WHERE name = 'Factoring Fee' LIMIT 1;
  SELECT id INTO dispatching_expense_type_id FROM expense_types WHERE name = 'Dispatching Fee' LIMIT 1;

  -- CORREGIDO: Usar company_payment_periods en lugar de payment_periods
  SELECT dpc.id INTO dpc_id 
  FROM driver_period_calculations dpc
  JOIN company_payment_periods cpp ON dpc.company_payment_period_id = cpp.id
  WHERE dpc.driver_user_id = driver_user_id_param
  AND cpp.id = payment_period_id_param
  LIMIT 1;

  IF dpc_id IS NULL THEN
    RAISE LOG '⚠️ No driver_period_calculation found for driver % in period %', driver_user_id_param, payment_period_id_param;
    RETURN;
  END IF;

  -- Crear deducción por Leasing si aplica
  IF leasing_pct_param > 0 AND leasing_expense_type_id IS NOT NULL THEN
    deduction_amount := ROUND(load_amount_param * (leasing_pct_param / 100), 2);
    
    INSERT INTO expense_instances (
      user_id,
      payment_period_id,
      expense_type_id,
      amount,
      description,
      expense_date,
      created_by,
      applied_by,
      applied_at,
      status
    ) VALUES (
      driver_user_id_param,
      dpc_id,
      leasing_expense_type_id,
      deduction_amount,
      'Deducción automática por Leasing (' || leasing_pct_param || '%) - Carga ' || load_number_param,
      CURRENT_DATE,
      created_by_param,
      created_by_param,
      now(),
      'applied'
    )
    ON CONFLICT ON CONSTRAINT unique_expense_per_period_type_driver DO NOTHING;
    
    RAISE LOG '💰 Created leasing deduction: $% for load %', deduction_amount, load_number_param;
  END IF;

  -- Crear deducción por Factoring si aplica
  IF factoring_pct_param > 0 AND factoring_expense_type_id IS NOT NULL THEN
    deduction_amount := ROUND(load_amount_param * (factoring_pct_param / 100), 2);
    
    INSERT INTO expense_instances (
      user_id,
      payment_period_id,
      expense_type_id,
      amount,
      description,
      expense_date,
      created_by,
      applied_by,
      applied_at,
      status
    ) VALUES (
      driver_user_id_param,
      dpc_id,
      factoring_expense_type_id,
      deduction_amount,
      'Deducción automática por Factoring (' || factoring_pct_param || '%) - Carga ' || load_number_param,
      CURRENT_DATE,
      created_by_param,
      created_by_param,
      now(),
      'applied'
    )
    ON CONFLICT ON CONSTRAINT unique_expense_per_period_type_driver DO NOTHING;
    
    RAISE LOG '💰 Created factoring deduction: $% for load %', deduction_amount, load_number_param;
  END IF;

  -- Crear deducción por Dispatching si aplica
  IF dispatching_pct_param > 0 AND dispatching_expense_type_id IS NOT NULL THEN
    deduction_amount := ROUND(load_amount_param * (dispatching_pct_param / 100), 2);
    
    INSERT INTO expense_instances (
      user_id,
      payment_period_id,
      expense_type_id,
      amount,
      description,
      expense_date,
      created_by,
      applied_by,
      applied_at,
      status
    ) VALUES (
      driver_user_id_param,
      dpc_id,
      dispatching_expense_type_id,
      deduction_amount,
      'Deducción automática por Dispatching (' || dispatching_pct_param || '%) - Carga ' || load_number_param,
      CURRENT_DATE,
      created_by_param,
      created_by_param,
      now(),
      'applied'
    )
    ON CONFLICT ON CONSTRAINT unique_expense_per_period_type_driver DO NOTHING;
    
    RAISE LOG '💰 Created dispatching deduction: $% for load %', deduction_amount, load_number_param;
  END IF;

  RAISE LOG '✅ Completed percentage deductions for load % - Amount: $%', load_number_param, load_amount_param;
    
EXCEPTION WHEN OTHERS THEN
  RAISE LOG '❌ Error creating percentage deductions for load %: %', load_number_param, SQLERRM;
  -- No re-raise para evitar que falle toda la operación
END;
$function$;