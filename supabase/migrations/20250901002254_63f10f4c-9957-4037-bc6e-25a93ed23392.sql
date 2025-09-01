-- ===================================================================
-- LIMPIAR ÚLTIMO CONFLICTO EN driver_period_calculations
-- ===================================================================

-- Ver qué política está duplicada
-- DROP POLICY IF EXISTS "driver_period_calculations_update_secure" ON public.driver_period_calculations;

-- Mantener solo la política de inmutabilidad crítica
-- La política "driver_period_calculations_update_immutable_after_payment" ya está creada y es la correcta

-- Verificar que no hay otras políticas UPDATE conflictivas
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    -- Buscar todas las políticas UPDATE en driver_period_calculations que no sean la de inmutabilidad
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'driver_period_calculations' 
          AND cmd = 'UPDATE' 
          AND policyname != 'driver_period_calculations_update_immutable_after_payment'
    LOOP
        -- Eliminar política conflictiva
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.driver_period_calculations', policy_record.policyname);
        RAISE NOTICE 'Eliminada política conflictiva: %', policy_record.policyname;
    END LOOP;
END $$;