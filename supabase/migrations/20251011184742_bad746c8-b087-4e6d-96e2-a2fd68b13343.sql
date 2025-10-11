-- ===============================================
-- 🚨 FASE 3: MIGRACIÓN DE FKS (Corregida con CASCADE)
-- ===============================================

-- 3.1: Crear user_payment_periods para todas las combinaciones existentes
INSERT INTO user_payment_periods (
  company_payment_period_id,
  user_id,
  gross_earnings,
  fuel_expenses,
  total_deductions,
  other_income,
  net_payment,
  has_negative_balance,
  payment_status,
  user_role
)
SELECT DISTINCT
  l.payment_period_id AS company_payment_period_id,
  l.driver_user_id AS user_id,
  0, 0, 0, 0, 0, false,
  'calculated',
  'driver'
FROM loads l
WHERE l.payment_period_id IS NOT NULL
  AND l.driver_user_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM user_payment_periods upp
    WHERE upp.company_payment_period_id = l.payment_period_id
      AND upp.user_id = l.driver_user_id
  );

INSERT INTO migration_audit_log (phase, operation, records_affected, status)
VALUES ('fk_migration', 'create_missing_user_payment_periods', 
  (SELECT COUNT(*) FROM user_payment_periods), 'completed');

-- 3.2: Actualizar loads - crear nueva columna primero
ALTER TABLE loads ADD COLUMN IF NOT EXISTS user_payment_period_id UUID;

UPDATE loads l
SET user_payment_period_id = (
  SELECT upp.id 
  FROM user_payment_periods upp
  WHERE upp.company_payment_period_id = l.payment_period_id
    AND upp.user_id = l.driver_user_id
  LIMIT 1
)
WHERE l.payment_period_id IS NOT NULL 
  AND l.driver_user_id IS NOT NULL;

-- 3.3: Eliminar columna antigua CON CASCADE (esto eliminará triggers y policies dependientes)
ALTER TABLE loads DROP COLUMN payment_period_id CASCADE;

-- 3.4: Renombrar nueva columna
ALTER TABLE loads RENAME COLUMN user_payment_period_id TO payment_period_id;

-- 3.5: Añadir nuevo FK correcto
ALTER TABLE loads
ADD CONSTRAINT loads_payment_period_id_fkey
FOREIGN KEY (payment_period_id)
REFERENCES user_payment_periods(id)
ON DELETE SET NULL;

INSERT INTO migration_audit_log (phase, operation, records_affected, status)
VALUES ('fk_migration', 'update_loads_fk_completed', 
  (SELECT COUNT(*) FROM loads WHERE payment_period_id IS NOT NULL), 'completed');