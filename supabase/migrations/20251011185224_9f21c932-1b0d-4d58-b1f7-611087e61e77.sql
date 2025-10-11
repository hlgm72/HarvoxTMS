-- ===============================================
-- 🚨 FASE 3: Migrar FK de fuel_expenses (sin triggers)
-- ===============================================

-- Crear user_payment_periods faltantes desde fuel_expenses
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
  fe.payment_period_id AS company_payment_period_id,
  fe.driver_user_id AS user_id,
  0, 0, 0, 0, 0, false,
  'calculated',
  'driver'
FROM fuel_expenses fe
WHERE fe.payment_period_id IS NOT NULL
  AND fe.driver_user_id IS NOT NULL
  AND EXISTS (SELECT 1 FROM company_payment_periods WHERE id = fe.payment_period_id)
  AND NOT EXISTS (
    SELECT 1 FROM user_payment_periods upp
    WHERE upp.company_payment_period_id = fe.payment_period_id
      AND upp.user_id = fe.driver_user_id
  );

-- Crear nueva columna y actualizar
ALTER TABLE fuel_expenses ADD COLUMN IF NOT EXISTS user_payment_period_id UUID;

UPDATE fuel_expenses fe
SET user_payment_period_id = (
  SELECT upp.id 
  FROM user_payment_periods upp
  JOIN company_payment_periods cpp ON upp.company_payment_period_id = cpp.id
  WHERE upp.user_id = fe.driver_user_id
    AND fe.transaction_date::date BETWEEN cpp.period_start_date AND cpp.period_end_date
  LIMIT 1
)
WHERE fe.payment_period_id IS NOT NULL
  AND fe.driver_user_id IS NOT NULL;

-- Eliminar columna antigua con CASCADE
ALTER TABLE fuel_expenses DROP COLUMN payment_period_id CASCADE;

-- Renombrar nueva columna
ALTER TABLE fuel_expenses RENAME COLUMN user_payment_period_id TO payment_period_id;

-- Añadir FK
ALTER TABLE fuel_expenses
ADD CONSTRAINT fuel_expenses_payment_period_id_fkey
FOREIGN KEY (payment_period_id)
REFERENCES user_payment_periods(id)
ON DELETE SET NULL;

INSERT INTO migration_audit_log (phase, operation, records_affected, status)
VALUES ('fk_migration', 'fuel_expenses_fk_migrated', 
  (SELECT COUNT(*) FROM fuel_expenses WHERE payment_period_id IS NOT NULL), 'completed');