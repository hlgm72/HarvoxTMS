-- ===============================================
-- 🛡️ SISTEMA DE PROTECCIÓN DE TRIGGERS CRÍTICOS
-- ===============================================
-- Esta función evita que se eliminen triggers críticos accidentalmente

-- 1. Función que verifica y restaura triggers críticos
CREATE OR REPLACE FUNCTION public.ensure_critical_triggers_exist()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  missing_triggers TEXT[] := ARRAY[]::TEXT[];
  restored_count INTEGER := 0;
BEGIN
  -- Verificar trigger de deducciones por porcentaje
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.triggers 
    WHERE trigger_name = 'trigger_auto_generate_percentage_deductions'
    AND event_object_table = 'loads'
  ) THEN
    missing_triggers := array_append(missing_triggers, 'trigger_auto_generate_percentage_deductions');
    
    CREATE TRIGGER trigger_auto_generate_percentage_deductions
      AFTER INSERT ON loads
      FOR EACH ROW
      EXECUTE FUNCTION auto_generate_percentage_deductions();
    
    restored_count := restored_count + 1;
  END IF;

  -- Verificar trigger de cálculos automáticos
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.triggers 
    WHERE trigger_name = 'auto_create_driver_calculations_trigger'
    AND event_object_table = 'company_payment_periods'
  ) THEN
    missing_triggers := array_append(missing_triggers, 'auto_create_driver_calculations_trigger');
    
    CREATE TRIGGER auto_create_driver_calculations_trigger
      AFTER INSERT ON company_payment_periods
      FOR EACH ROW
      EXECUTE FUNCTION auto_create_driver_calculations();
    
    restored_count := restored_count + 1;
  END IF;

  -- Verificar trigger de auto-lock
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.triggers 
    WHERE trigger_name = 'auto_lock_period_trigger'
    AND event_object_table = 'driver_period_calculations'
  ) THEN
    missing_triggers := array_append(missing_triggers, 'auto_lock_period_trigger');
    
    CREATE TRIGGER auto_lock_period_trigger
      AFTER UPDATE ON driver_period_calculations
      FOR EACH ROW
      EXECUTE FUNCTION auto_lock_period_when_all_paid();
    
    restored_count := restored_count + 1;
  END IF;

  -- Log si se encontraron triggers faltantes
  IF restored_count > 0 THEN
    INSERT INTO archive_logs (
      operation_type,
      table_name,
      details,
      triggered_by
    ) VALUES (
      'TRIGGER_RESTORATION',
      'system_protection',
      jsonb_build_object(
        'missing_triggers', missing_triggers,
        'restored_count', restored_count,
        'restored_at', now()
      ),
      'ensure_critical_triggers_exist'
    );
  END IF;

  RETURN jsonb_build_object(
    'status', 'success',
    'missing_triggers_found', array_length(missing_triggers, 1),
    'triggers_restored', restored_count,
    'missing_triggers', missing_triggers,
    'checked_at', now()
  );
END;
$$;

-- 2. Función que se ejecuta automáticamente para verificar triggers
CREATE OR REPLACE FUNCTION public.auto_check_triggers()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Ejecutar verificación de triggers críticos cada vez que se modifica schema_migrations
  PERFORM ensure_critical_triggers_exist();
  RETURN NEW;
END;
$$;

-- 3. Crear trigger en schema_migrations para auto-verificación
DROP TRIGGER IF EXISTS auto_check_triggers_on_migration ON supabase_migrations.schema_migrations;
CREATE TRIGGER auto_check_triggers_on_migration
  AFTER INSERT ON supabase_migrations.schema_migrations
  FOR EACH ROW
  EXECUTE FUNCTION auto_check_triggers();

-- 4. Ejecutar verificación inmediata
SELECT ensure_critical_triggers_exist();