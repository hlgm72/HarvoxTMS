-- ===============================================
-- 🚨 FASE 3: Migrar FKs de expense_instances y other_income
-- ===============================================

-- EXPENSE_INSTANCES
-- Crear user_payment_periods faltantes
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
  ei.payment_period_id AS company_payment_period_id,
  ei.user_id,
  0, 0, 0, 0, 0, false,
  'calculated',
  'driver'
FROM expense_instances ei
WHERE ei.payment_period_id IS NOT NULL
  AND ei.user_id IS NOT NULL
  AND EXISTS (SELECT 1 FROM company_payment_periods WHERE id = ei.payment_period_id)
  AND NOT EXISTS (
    SELECT 1 FROM user_payment_periods upp
    WHERE upp.company_payment_period_id = ei.payment_period_id
      AND upp.user_id = ei.user_id
  );

-- Actualizar expense_instances
ALTER TABLE expense_instances ADD COLUMN IF NOT EXISTS user_payment_period_id UUID;

UPDATE expense_instances ei
SET user_payment_period_id = (
  SELECT upp.id 
  FROM user_payment_periods upp
  WHERE upp.company_payment_period_id = ei.payment_period_id
    AND upp.user_id = ei.user_id
  LIMIT 1
)
WHERE ei.payment_period_id IS NOT NULL AND ei.user_id IS NOT NULL;

ALTER TABLE expense_instances DROP COLUMN IF EXISTS payment_period_id CASCADE;
ALTER TABLE expense_instances RENAME COLUMN user_payment_period_id TO payment_period_id;

ALTER TABLE expense_instances
ADD CONSTRAINT expense_instances_payment_period_id_fkey
FOREIGN KEY (payment_period_id) REFERENCES user_payment_periods(id) ON DELETE SET NULL;

-- OTHER_INCOME (si usa driver_user_id, ajustar)
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
  oi.payment_period_id AS company_payment_period_id,
  oi.user_id,
  0, 0, 0, 0, 0, false,
  'calculated',
  'driver'
FROM other_income oi
WHERE oi.payment_period_id IS NOT NULL
  AND oi.user_id IS NOT NULL
  AND EXISTS (SELECT 1 FROM company_payment_periods WHERE id = oi.payment_period_id)
  AND NOT EXISTS (
    SELECT 1 FROM user_payment_periods upp
    WHERE upp.company_payment_period_id = oi.payment_period_id
      AND upp.user_id = oi.user_id
  );

-- Actualizar other_income
ALTER TABLE other_income ADD COLUMN IF NOT EXISTS user_payment_period_id UUID;

UPDATE other_income oi
SET user_payment_period_id = (
  SELECT upp.id 
  FROM user_payment_periods upp
  WHERE upp.company_payment_period_id = oi.payment_period_id
    AND upp.user_id = oi.user_id
  LIMIT 1
)
WHERE oi.payment_period_id IS NOT NULL AND oi.user_id IS NOT NULL;

ALTER TABLE other_income DROP COLUMN IF EXISTS payment_period_id CASCADE;
ALTER TABLE other_income RENAME COLUMN user_payment_period_id TO payment_period_id;

ALTER TABLE other_income
ADD CONSTRAINT other_income_payment_period_id_fkey
FOREIGN KEY (payment_period_id) REFERENCES user_payment_periods(id) ON DELETE SET NULL;

INSERT INTO migration_audit_log (phase, operation, records_affected, status)
VALUES ('fk_migration', 'expense_instances_and_other_income_migrated', 
  (SELECT COUNT(*) FROM expense_instances WHERE payment_period_id IS NOT NULL) + 
  (SELECT COUNT(*) FROM other_income WHERE payment_period_id IS NOT NULL), 
  'completed');