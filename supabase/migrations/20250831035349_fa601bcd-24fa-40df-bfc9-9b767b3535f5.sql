-- Limpiar y recalcular correctamente las deducciones para Diosvani
-- Primero eliminamos las deducciones existentes para este conductor en este período

DO $$
DECLARE
  dpc_record RECORD;
  total_leasing numeric := 0;
  total_factoring numeric := 0;
  total_dispatching numeric := 0;
  leasing_expense_type_id uuid;
  factoring_expense_type_id uuid;
  dispatching_expense_type_id uuid;
  current_user_id uuid;
BEGIN
  -- Obtener IDs de tipos de expense
  SELECT id INTO leasing_expense_type_id FROM expense_types WHERE name = 'Leasing Fee' LIMIT 1;
  SELECT id INTO factoring_expense_type_id FROM expense_types WHERE name = 'Factoring Fee' LIMIT 1;
  SELECT id INTO dispatching_expense_type_id FROM expense_types WHERE name = 'Dispatching Fee' LIMIT 1;

  -- Usuario por defecto para las correcciones
  SELECT ucr.user_id INTO current_user_id
  FROM user_company_roles ucr 
  WHERE ucr.role = 'superadmin' AND ucr.is_active = true 
  LIMIT 1;

  -- Obtener el driver_period_calculation para Diosvani
  SELECT dpc.id, dpc.driver_user_id, dpc.company_payment_period_id
  INTO dpc_record
  FROM driver_period_calculations dpc
  WHERE dpc.driver_user_id = '484d83b3-b928-46b3-9705-db225ddb9b0c'
    AND dpc.company_payment_period_id = '9bfc342f-6330-4d2d-8eab-ee9993d17bc3'
  LIMIT 1;

  IF FOUND THEN
    RAISE LOG '🔄 Limpiando deducciones existentes para DPC %', dpc_record.id;
    
    -- Eliminar deducciones automáticas existentes para este conductor/período
    DELETE FROM expense_instances 
    WHERE user_id = dpc_record.driver_user_id
      AND payment_period_id = dpc_record.id
      AND expense_type_id IN (leasing_expense_type_id, factoring_expense_type_id, dispatching_expense_type_id);

    -- Calcular totales correctos basados en todas las cargas
    SELECT 
      COALESCE(SUM(ROUND(l.total_amount * 0.05, 2)), 0) as leasing_total,
      COALESCE(SUM(ROUND(l.total_amount * 0.03, 2)), 0) as factoring_total,
      COALESCE(SUM(ROUND(l.total_amount * 0.05, 2)), 0) as dispatching_total
    INTO total_leasing, total_factoring, total_dispatching
    FROM loads l
    WHERE l.driver_user_id = dpc_record.driver_user_id
      AND l.payment_period_id = dpc_record.company_payment_period_id
      AND l.total_amount > 0;

    RAISE LOG '💰 Calculated totals - Leasing: $%, Factoring: $%, Dispatching: $%', 
      total_leasing, total_factoring, total_dispatching;

    -- Crear deducción consolidada por Leasing
    IF total_leasing > 0 AND leasing_expense_type_id IS NOT NULL THEN
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
        dpc_record.driver_user_id,
        dpc_record.id,
        leasing_expense_type_id,
        total_leasing,
        'Deducción automática por Leasing (5%) - Total de cargas del período',
        CURRENT_DATE,
        current_user_id,
        current_user_id,
        now(),
        'applied'
      );
      
      RAISE LOG '✅ Created consolidated leasing deduction: $%', total_leasing;
    END IF;

    -- Crear deducción consolidada por Factoring
    IF total_factoring > 0 AND factoring_expense_type_id IS NOT NULL THEN
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
        dpc_record.driver_user_id,
        dpc_record.id,
        factoring_expense_type_id,
        total_factoring,
        'Deducción automática por Factoring (3%) - Total de cargas del período',
        CURRENT_DATE,
        current_user_id,
        current_user_id,
        now(),
        'applied'
      );
      
      RAISE LOG '✅ Created consolidated factoring deduction: $%', total_factoring;
    END IF;

    -- Crear deducción consolidada por Dispatching
    IF total_dispatching > 0 AND dispatching_expense_type_id IS NOT NULL THEN
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
        dpc_record.driver_user_id,
        dpc_record.id,
        dispatching_expense_type_id,
        total_dispatching,
        'Deducción automática por Dispatching (5%) - Total de cargas del período',
        CURRENT_DATE,
        current_user_id,
        current_user_id,
        now(),
        'applied'
      );
      
      RAISE LOG '✅ Created consolidated dispatching deduction: $%', total_dispatching;
    END IF;

    -- Recalcular automáticamente los totales del período
    PERFORM recalculate_payment_period_totals(dpc_record.company_payment_period_id);
    RAISE LOG '🔄 Recalculated payment period totals';

    RAISE LOG '✅ Deduction correction completed for Diosvani - Total deductions should be: $%', 
      (total_leasing + total_factoring + total_dispatching);
  ELSE
    RAISE LOG '❌ No driver_period_calculation found for Diosvani';
  END IF;
END $$;