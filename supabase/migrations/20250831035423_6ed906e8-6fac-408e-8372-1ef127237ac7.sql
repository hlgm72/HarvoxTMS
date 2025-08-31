-- Corregir los porcentajes de leasing en las cargas de Diosvani y recalcular deducciones
-- El problema es que las cargas tienen leasing_percentage = 0 cuando debería ser 5%

DO $$
DECLARE
  load_record RECORD;
  oo_record RECORD;
  leasing_expense_type_id uuid;
  dpc_id uuid;
  current_user_id uuid;
  missing_leasing_amount numeric := 0;
BEGIN
  -- Obtener porcentajes correctos del Owner Operator
  SELECT leasing_percentage, factoring_percentage, dispatching_percentage
  INTO oo_record
  FROM owner_operators 
  WHERE user_id = '484d83b3-b928-46b3-9705-db225ddb9b0c' 
  AND is_active = true
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE LOG '❌ No owner_operator record found for Diosvani';
    RETURN;
  END IF;

  RAISE LOG '📊 Owner Operator percentages: Leasing=%, Factoring=%, Dispatching=%', 
    oo_record.leasing_percentage, oo_record.factoring_percentage, oo_record.dispatching_percentage;

  -- Obtener ID del tipo de expense para Leasing
  SELECT id INTO leasing_expense_type_id FROM expense_types WHERE name = 'Leasing Fee' LIMIT 1;
  
  -- Usuario por defecto para las correcciones
  SELECT ucr.user_id INTO current_user_id
  FROM user_company_roles ucr 
  WHERE ucr.role = 'superadmin' AND ucr.is_active = true 
  LIMIT 1;

  -- Obtener driver_period_calculation_id
  SELECT dpc.id INTO dpc_id 
  FROM driver_period_calculations dpc
  JOIN company_payment_periods cpp ON dpc.company_payment_period_id = cpp.id
  WHERE dpc.driver_user_id = '484d83b3-b928-46b3-9705-db225ddb9b0c'
  AND cpp.id = '9bfc342f-6330-4d2d-8eab-ee9993d17bc3'
  LIMIT 1;

  -- 1. Corregir porcentajes en las cargas que tienen leasing_percentage = 0
  UPDATE loads 
  SET 
    leasing_percentage = oo_record.leasing_percentage,
    updated_at = now()
  WHERE driver_user_id = '484d83b3-b928-46b3-9705-db225ddb9b0c'
    AND payment_period_id = '9bfc342f-6330-4d2d-8eab-ee9993d17bc3'
    AND leasing_percentage = 0
    AND oo_record.leasing_percentage > 0;

  RAISE LOG '✅ Updated leasing percentages in loads';

  -- 2. Calcular el monto faltante de deducciones por Leasing
  SELECT 
    SUM(l.total_amount * (oo_record.leasing_percentage / 100)) INTO missing_leasing_amount
  FROM loads l
  WHERE l.driver_user_id = '484d83b3-b928-46b3-9705-db225ddb9b0c'
    AND l.payment_period_id = '9bfc342f-6330-4d2d-8eab-ee9993d17bc3'
    AND l.total_amount > 0;

  missing_leasing_amount := COALESCE(missing_leasing_amount, 0);
  
  RAISE LOG '💰 Missing leasing amount calculated: $%', missing_leasing_amount;

  -- 3. Eliminar deducciones de Leasing existentes para este período (para evitar duplicados)
  DELETE FROM expense_instances 
  WHERE user_id = '484d83b3-b928-46b3-9705-db225ddb9b0c'
    AND payment_period_id = dpc_id
    AND expense_type_id = leasing_expense_type_id;

  RAISE LOG '🗑️ Removed existing leasing deductions to avoid duplicates';

  -- 4. Crear la deducción correcta por Leasing si aplica
  IF missing_leasing_amount > 0 AND leasing_expense_type_id IS NOT NULL AND dpc_id IS NOT NULL THEN
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
      '484d83b3-b928-46b3-9705-db225ddb9b0c',
      dpc_id,
      leasing_expense_type_id,
      ROUND(missing_leasing_amount, 2),
      'Deducción automática por Leasing (' || oo_record.leasing_percentage || '%) - Período completo',
      CURRENT_DATE,
      current_user_id,
      current_user_id,
      now(),
      'applied'
    );
    
    RAISE LOG '💰 Created corrected leasing deduction: $%', ROUND(missing_leasing_amount, 2);
  END IF;

  -- 5. Recalcular automáticamente los totales del período
  PERFORM recalculate_payment_period_totals('9bfc342f-6330-4d2d-8eab-ee9993d17bc3');
  RAISE LOG '🔄 Recalculated payment period totals';

  RAISE LOG '✅ Correction completed for Diosvani leasing percentages and deductions';
END $$;