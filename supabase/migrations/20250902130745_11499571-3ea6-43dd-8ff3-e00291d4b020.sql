-- ===============================================
-- 🧹 LIMPIEZA DE TRIGGERS DUPLICADOS EN LOADS
-- Eliminar triggers duplicados y conflictivos
-- ===============================================

-- ❌ ELIMINAR TODOS LOS TRIGGERS DUPLICADOS
DROP TRIGGER IF EXISTS auto_recalculate_loads_trigger ON loads;
DROP TRIGGER IF EXISTS loads_auto_recalculate_trigger ON loads;
DROP TRIGGER IF EXISTS trigger_auto_recalculate_loads ON loads;
DROP TRIGGER IF EXISTS trigger_auto_recalculate_loads_delete ON loads;
DROP TRIGGER IF EXISTS trigger_auto_recalculate_loads_insert ON loads;
DROP TRIGGER IF EXISTS trigger_auto_recalculate_loads_update ON loads;
DROP TRIGGER IF EXISTS trigger_auto_recalculate_on_loads_delete ON loads;
DROP TRIGGER IF EXISTS trigger_auto_recalculate_on_loads_insert ON loads;
DROP TRIGGER IF EXISTS trigger_auto_recalculate_on_loads_update ON loads;
DROP TRIGGER IF EXISTS trigger_auto_recalculate_on_loads ON loads;

-- ✅ MANTENER SOLO LOS TRIGGERS ESENCIALES:
-- 1. trigger_auto_recalculate_on_load_changes (recálculos)
-- 2. trigger_auto_generate_percentage_deductions (deducciones)
-- 3. trg_recalc_driver_period_after_load_insupd y trg_recalc_driver_period_after_load_del
-- 4. inherit_percentages_on_load_insert (herencia de porcentajes)
-- 5. loads_status_change_trigger (log de cambios de estado)

RAISE LOG '🧹 TRIGGERS DUPLICADOS ELIMINADOS - Solo triggers esenciales activos';

-- Verificar triggers activos restantes
DO $$
DECLARE
    trigger_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO trigger_count
    FROM pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
    WHERE c.relname = 'loads' AND NOT t.tgisinternal;
    
    RAISE LOG '✅ TRIGGERS ACTIVOS EN LOADS: %', trigger_count;
END $$;