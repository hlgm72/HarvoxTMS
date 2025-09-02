-- ===============================================
-- 🔍 DEBUG: Verificar relaciones entre tablas
-- Entender por qué el recálculo no funciona
-- ===============================================

-- Debug: Verificar cargas
DO $$
DECLARE
    loads_count INTEGER;
    loads_sum NUMERIC;
BEGIN
    SELECT COUNT(*), COALESCE(SUM(total_amount), 0)
    INTO loads_count, loads_sum
    FROM loads l
    WHERE l.driver_user_id = '484d83b3-b928-46b3-9705-db225ddb9b0c'
      AND l.payment_period_id = '49cb0343-7af4-4df0-b31e-75380709c58e'
      AND l.status NOT IN ('cancelled', 'rejected');
    
    RAISE LOG '🔍 DEBUG CARGAS: count=%, sum=$%', loads_count, loads_sum;
END $$;

-- Debug: Verificar calculation_record_id
DO $$
DECLARE
    calc_id UUID;
BEGIN
    SELECT id INTO calc_id
    FROM driver_period_calculations
    WHERE driver_user_id = '484d83b3-b928-46b3-9705-db225ddb9b0c'
      AND company_payment_period_id = '49cb0343-7af4-4df0-b31e-75380709c58e';
    
    RAISE LOG '🔍 DEBUG CALCULATION_ID: %', calc_id;
END $$;

-- Debug: Verificar deducciones
DO $$
DECLARE
    deductions_count INTEGER;
    deductions_sum NUMERIC;
    calc_id UUID := '070bdab0-179e-4540-96e0-5496c6dbd11f';
BEGIN
    SELECT COUNT(*), COALESCE(SUM(amount), 0)
    INTO deductions_count, deductions_sum
    FROM expense_instances ei
    WHERE ei.user_id = '484d83b3-b928-46b3-9705-db225ddb9b0c'
      AND ei.payment_period_id = calc_id
      AND ei.status = 'applied';
    
    RAISE LOG '🔍 DEBUG DEDUCCIONES: count=%, sum=$%', deductions_count, deductions_sum;
END $$;