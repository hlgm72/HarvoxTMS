-- Recalcular todos los períodos de pago para actualizar gross_earnings
-- después de cambiar cargas de 'draft' a 'delivered'

DO $$
DECLARE
    calc_record RECORD;
    total_calculations INTEGER := 0;
    updated_calculations INTEGER := 0;
BEGIN
    -- Contar total de cálculos
    SELECT COUNT(*) INTO total_calculations FROM driver_period_calculations;
    
    RAISE NOTICE 'Iniciando recálculo de % períodos de pago...', total_calculations;
    
    -- Iterar sobre todos los cálculos de períodos
    FOR calc_record IN 
        SELECT id FROM driver_period_calculations
        ORDER BY created_at
    LOOP
        BEGIN
            -- Llamar función de recálculo para cada período
            PERFORM recalculate_payment_period_totals(calc_record.id);
            updated_calculations := updated_calculations + 1;
            
            -- Log progreso cada 10 registros
            IF updated_calculations % 10 = 0 THEN
                RAISE NOTICE 'Procesados %/% cálculos...', updated_calculations, total_calculations;
            END IF;
            
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Error recalculando período %: %', calc_record.id, SQLERRM;
        END;
    END LOOP;
    
    RAISE NOTICE 'Recálculo completado: %/% períodos actualizados', updated_calculations, total_calculations;
END $$;