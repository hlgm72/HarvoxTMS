-- Aplicar corrección retroactiva para las cargas de Diosvani que no tienen deducciones automáticas
-- Este script agregará las deducciones faltantes para las cargas existentes

DO $$
DECLARE
  load_record RECORD;
  oo_record RECORD;
  leasing_expense_type_id uuid;
  factoring_expense_type_id uuid;
  dispatching_expense_type_id uuid;
  dpc_id uuid;
  current_user_id uuid;
BEGIN
  -- Obtener IDs de tipos de expense 
  SELECT id INTO leasing_expense_type_id FROM expense_types WHERE name = 'Leasing Fee' LIMIT 1;
  SELECT id INTO factoring_expense_type_id FROM expense_types WHERE name = 'Factoring Fee' LIMIT 1;
  SELECT id INTO dispatching_expense_type_id FROM expense_types WHERE name = 'Dispatching Fee' LIMIT 1;

  -- Usuario por defecto para las correcciones (usar el primer superadmin)
  SELECT ucr.user_id INTO current_user_id
  FROM user_company_roles ucr 
  WHERE ucr.role = 'superadmin' AND ucr.is_active = true 
  LIMIT 1;

  -- Iterar por las cargas de Diosvani en el período actual que no tienen deducciones
  FOR load_record IN 
    SELECT 
      l.id as load_id,
      l.load_number,
      l.driver_user_id,
      l.total_amount,
      l.payment_period_id,
      l.created_at
    FROM loads l
    WHERE l.driver_user_id = '484d83b3-b928-46b3-9705-db225ddb9b0c'
      AND l.payment_period_id = '9bfc342f-6330-4d2d-8eab-ee9993d17bc3'
      AND l.total_amount > 0
      -- Solo cargas que NO tienen deducciones automáticas ya creadas
      AND NOT EXISTS (
        SELECT 1 FROM expense_instances ei
        WHERE ei.user_id = l.driver_user_id
        AND ei.description LIKE '%Carga ' || l.load_number || '%'
      )
  LOOP
    RAISE LOG '🔍 Processing load % (%) - Amount: $%', load_record.load_number, load_record.load_id, load_record.total_amount;

    -- Obtener porcentajes del Owner Operator
    SELECT leasing_percentage, factoring_percentage, dispatching_percentage
    INTO oo_record
    FROM owner_operators 
    WHERE user_id = load_record.driver_user_id 
    AND is_active = true
    LIMIT 1;

    IF FOUND THEN
      -- Obtener driver_period_calculation_id
      SELECT id INTO dpc_id 
      FROM driver_period_calculations dpc
      JOIN company_payment_periods cpp ON dpc.company_payment_period_id = cpp.id
      WHERE dpc.driver_user_id = load_record.driver_user_id
      AND cpp.id = load_record.payment_period_id
      LIMIT 1;

      IF dpc_id IS NOT NULL THEN
        -- Crear deducción por Leasing si aplica
        IF oo_record.leasing_percentage > 0 AND leasing_expense_type_id IS NOT NULL THEN
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
            load_record.driver_user_id,
            dpc_id,
            leasing_expense_type_id,
            ROUND(load_record.total_amount * (oo_record.leasing_percentage / 100), 2),
            'Deducción automática por Leasing (' || oo_record.leasing_percentage || '%) - Carga ' || load_record.load_number,
            load_record.created_at::date,
            current_user_id,
            current_user_id,
            now(),
            'applied'
          );
          
          RAISE LOG '💰 Created retroactive leasing deduction: $% for load %', ROUND(load_record.total_amount * (oo_record.leasing_percentage / 100), 2), load_record.load_number;
        END IF;

        -- Crear deducción por Factoring si aplica
        IF oo_record.factoring_percentage > 0 AND factoring_expense_type_id IS NOT NULL THEN
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
            load_record.driver_user_id,
            dpc_id,
            factoring_expense_type_id,
            ROUND(load_record.total_amount * (oo_record.factoring_percentage / 100), 2),
            'Deducción automática por Factoring (' || oo_record.factoring_percentage || '%) - Carga ' || load_record.load_number,
            load_record.created_at::date,
            current_user_id,
            current_user_id,
            now(),
            'applied'
          );
          
          RAISE LOG '💰 Created retroactive factoring deduction: $% for load %', ROUND(load_record.total_amount * (oo_record.factoring_percentage / 100), 2), load_record.load_number;
        END IF;

        -- Crear deducción por Dispatching si aplica
        IF oo_record.dispatching_percentage > 0 AND dispatching_expense_type_id IS NOT NULL THEN
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
            load_record.driver_user_id,
            dpc_id,
            dispatching_expense_type_id,
            ROUND(load_record.total_amount * (oo_record.dispatching_percentage / 100), 2),
            'Deducción automática por Dispatching (' || oo_record.dispatching_percentage || '%) - Carga ' || load_record.load_number,
            load_record.created_at::date,
            current_user_id,
            current_user_id,
            now(),
            'applied'
          );
          
          RAISE LOG '💰 Created retroactive dispatching deduction: $% for load %', ROUND(load_record.total_amount * (oo_record.dispatching_percentage / 100), 2), load_record.load_number;
        END IF;

      ELSE
        RAISE LOG '⚠️ No driver_period_calculation found for load %', load_record.load_number;
      END IF;
    ELSE
      RAISE LOG '⚠️ No owner_operator record found for driver in load %', load_record.load_number;
    END IF;
  END LOOP;

  -- Recalcular automáticamente los totales del período
  PERFORM recalculate_payment_period_totals('9bfc342f-6330-4d2d-8eab-ee9993d17bc3');
  RAISE LOG '🔄 Recalculated payment period totals for Diosvani period';

  RAISE LOG '✅ Retroactive correction completed for Diosvani loads';
END $$;