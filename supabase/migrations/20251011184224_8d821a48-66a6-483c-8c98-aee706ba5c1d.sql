-- ===============================================
-- 🚨 FASE 2: MIGRACIÓN DE SCHEMA
-- ===============================================

-- 2.1 Eliminar columna redundante total_income
ALTER TABLE driver_period_calculations DROP COLUMN IF EXISTS total_income;

INSERT INTO migration_audit_log (phase, operation, status)
VALUES ('schema_migration', 'drop_total_income_column', 'completed');

-- 2.2 Renombrar la tabla principal
ALTER TABLE driver_period_calculations RENAME TO user_payment_periods;

INSERT INTO migration_audit_log (phase, operation, status)
VALUES ('schema_migration', 'rename_table', 'completed');

-- 2.3 Renombrar columna clave
ALTER TABLE user_payment_periods 
RENAME COLUMN driver_user_id TO user_id;

INSERT INTO migration_audit_log (phase, operation, status)
VALUES ('schema_migration', 'rename_column_driver_user_id', 'completed');

-- 2.4 Añadir columna user_role
ALTER TABLE user_payment_periods 
ADD COLUMN IF NOT EXISTS user_role TEXT DEFAULT 'driver';

-- Añadir constraint para validar roles
ALTER TABLE user_payment_periods 
DROP CONSTRAINT IF EXISTS check_user_role;

ALTER TABLE user_payment_periods
ADD CONSTRAINT check_user_role 
CHECK (user_role IN ('driver', 'dispatcher', 'operations_manager', 'company_owner'));

INSERT INTO migration_audit_log (phase, operation, status)
VALUES ('schema_migration', 'add_user_role_column', 'completed');

-- 2.5 Actualizar índices
DROP INDEX IF EXISTS idx_driver_period_calculations_period_driver;
DROP INDEX IF EXISTS idx_driver_period_calculations_driver;
DROP INDEX IF EXISTS idx_driver_period_calculations_payment_status;

CREATE INDEX IF NOT EXISTS idx_user_payment_periods_period_user 
ON user_payment_periods(company_payment_period_id, user_id);

CREATE INDEX IF NOT EXISTS idx_user_payment_periods_user_status 
ON user_payment_periods(user_id, payment_status);

CREATE INDEX IF NOT EXISTS idx_user_payment_periods_status 
ON user_payment_periods(payment_status) 
WHERE payment_status != 'paid';

CREATE INDEX IF NOT EXISTS idx_user_payment_periods_role 
ON user_payment_periods(user_role, payment_status);

INSERT INTO migration_audit_log (phase, operation, status)
VALUES ('schema_migration', 'update_indexes', 'completed');

-- 2.6 Actualizar constraints
ALTER TABLE user_payment_periods 
DROP CONSTRAINT IF EXISTS unique_user_per_company_period;

ALTER TABLE user_payment_periods 
ADD CONSTRAINT unique_user_per_company_period 
UNIQUE (company_payment_period_id, user_id);

ALTER TABLE user_payment_periods
DROP CONSTRAINT IF EXISTS fk_user_payment_periods_user;

ALTER TABLE user_payment_periods
ADD CONSTRAINT fk_user_payment_periods_user
FOREIGN KEY (user_id) 
REFERENCES auth.users(id) 
ON DELETE CASCADE;

INSERT INTO migration_audit_log (phase, operation, status)
VALUES ('schema_migration', 'update_constraints', 'completed');

-- Resumen final de Fase 2
INSERT INTO migration_audit_log (phase, operation, records_affected, status)
VALUES 
  ('summary', 'phase_2_completed', 
   (SELECT COUNT(*) FROM user_payment_periods), 
   'completed');