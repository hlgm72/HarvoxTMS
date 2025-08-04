-- Buscar y deshabilitar todos los triggers que podrían interferir
DO $$
DECLARE
    trigger_name text;
BEGIN
    FOR trigger_name IN 
        SELECT tgname FROM pg_trigger 
        WHERE tgrelid = 'fuel_expenses'::regclass 
        AND tgname LIKE '%recalculate%'
    LOOP
        EXECUTE 'ALTER TABLE fuel_expenses DISABLE TRIGGER ' || trigger_name;
    END LOOP;
    
    FOR trigger_name IN 
        SELECT tgname FROM pg_trigger 
        WHERE tgrelid = 'loads'::regclass 
        AND tgname LIKE '%recalculate%'
    LOOP
        EXECUTE 'ALTER TABLE loads DISABLE TRIGGER ' || trigger_name;
    END LOOP;
END $$;

-- Eliminar directamente
DELETE FROM fuel_expenses 
WHERE payment_period_id IN (
  SELECT id FROM company_payment_periods 
  WHERE company_id = 'e5d52767-ca59-4c28-94e4-058aff6a037b'
  AND status = 'open'
);

DELETE FROM loads 
WHERE payment_period_id IN (
  SELECT id FROM company_payment_periods 
  WHERE company_id = 'e5d52767-ca59-4c28-94e4-058aff6a037b'
  AND status = 'open'
);

DELETE FROM expense_instances 
WHERE payment_period_id IN (
  SELECT dpc.id FROM driver_period_calculations dpc 
  WHERE dpc.company_payment_period_id IN (
    SELECT id FROM company_payment_periods 
    WHERE company_id = 'e5d52767-ca59-4c28-94e4-058aff6a037b'
    AND status = 'open'
  )
);

DELETE FROM driver_period_calculations 
WHERE company_payment_period_id IN (
  SELECT id FROM company_payment_periods 
  WHERE company_id = 'e5d52767-ca59-4c28-94e4-058aff6a037b'
  AND status = 'open'
);

DELETE FROM company_payment_periods 
WHERE company_id = 'e5d52767-ca59-4c28-94e4-058aff6a037b'
AND status = 'open';

-- Rehabilitar los triggers
DO $$
DECLARE
    trigger_name text;
BEGIN
    FOR trigger_name IN 
        SELECT tgname FROM pg_trigger 
        WHERE tgrelid = 'fuel_expenses'::regclass 
        AND tgname LIKE '%recalculate%'
    LOOP
        EXECUTE 'ALTER TABLE fuel_expenses ENABLE TRIGGER ' || trigger_name;
    END LOOP;
    
    FOR trigger_name IN 
        SELECT tgname FROM pg_trigger 
        WHERE tgrelid = 'loads'::regclass 
        AND tgname LIKE '%recalculate%'
    LOOP
        EXECUTE 'ALTER TABLE loads ENABLE TRIGGER ' || trigger_name;
    END LOOP;
END $$;