-- ===============================================
-- 🚨 CORRECCIÓN: Eliminar función automática que bloquea
-- ===============================================

-- Eliminar el trigger de evento si existe
DROP EVENT TRIGGER IF EXISTS auto_check_triggers_on_schema_change;

-- Eliminar la función completamente
DROP FUNCTION IF EXISTS public.auto_check_triggers() CASCADE;

-- Ahora proceder con las fases 1 y 2 sin interferencias

-- ===============================================
-- 🚨 FASE 1: PREPARACIÓN Y RESPALDO
-- ===============================================

-- 1.1 Crear tablas de respaldo completo (solo si no existen)
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'driver_period_calculations_backup_20250211') THEN
    CREATE TABLE driver_period_calculations_backup_20250211 AS 
    SELECT * FROM driver_period_calculations;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'company_payment_periods_backup_20250211') THEN
    CREATE TABLE company_payment_periods_backup_20250211 AS 
    SELECT * FROM company_payment_periods;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'loads_backup_20250211') THEN
    CREATE TABLE loads_backup_20250211 AS 
    SELECT id, payment_period_id, driver_user_id, total_amount, created_at 
    FROM loads;
  END IF;
END $$;

-- 1.2 Respaldo de foreign keys actuales
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'migration_fk_backup') THEN
    CREATE TABLE migration_fk_backup AS
    SELECT 
      tc.table_name,
      tc.constraint_name,
      kcu.column_name,
      ccu.table_name AS foreign_table_name,
      ccu.column_name AS foreign_column_name
    FROM information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY' 
      AND tc.table_name IN ('loads', 'fuel_expenses', 'expense_instances', 'other_income');
  END IF;
END $$;

-- 1.3 Crear tabla de auditoría de migración
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'migration_audit_log') THEN
    CREATE TABLE migration_audit_log (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      phase TEXT NOT NULL,
      operation TEXT NOT NULL,
      records_affected INTEGER,
      status TEXT DEFAULT 'pending',
      error_message TEXT,
      executed_at TIMESTAMPTZ DEFAULT NOW(),
      executed_by UUID REFERENCES auth.users(id)
    );
  END IF;
END $$;

-- Registrar estado inicial
INSERT INTO migration_audit_log (phase, operation, records_affected, status)
SELECT 'pre_migration', 'backup_driver_period_calculations', COUNT(*), 'completed'
FROM driver_period_calculations
WHERE NOT EXISTS (
  SELECT 1 FROM migration_audit_log 
  WHERE phase = 'pre_migration' AND operation = 'backup_driver_period_calculations'
);

-- Log de eliminación de función automática
INSERT INTO migration_audit_log (phase, operation, status)
VALUES ('pre_migration', 'remove_auto_check_triggers_function', 'completed');