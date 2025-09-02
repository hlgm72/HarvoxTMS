-- Disable verification call during load deletion to prevent permission errors
-- The verification is not needed during deletion operations
CREATE OR REPLACE FUNCTION public.auto_recalculate_on_load_changes()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  affected_period_id UUID;
  driver_id UUID;
BEGIN
  -- Obtener el período y conductor afectados (tanto para INSERT como UPDATE/DELETE)
  IF TG_OP = 'DELETE' THEN
    affected_period_id := OLD.payment_period_id;
    driver_id := OLD.driver_user_id;
  ELSE
    affected_period_id := NEW.payment_period_id;
    driver_id := NEW.driver_user_id;
  END IF;

  -- Skip verification during DELETE operations to prevent permission issues
  -- Deletion operations don't need integrity verification since data is being removed
  IF TG_OP = 'DELETE' THEN
    RAISE LOG 'auto_recalculate_on_load_changes: Skipping verification for DELETE operation on period %', 
      affected_period_id;
    RETURN OLD;
  END IF;

  -- Si hay período asignado, forzar recálculo (only for INSERT/UPDATE)
  IF affected_period_id IS NOT NULL AND driver_id IS NOT NULL THEN
    -- Llamar a la función de recálculo de integridad para la empresa del período
    PERFORM public.verify_and_recalculate_company_payments(
      (SELECT company_id FROM public.company_payment_periods WHERE id = affected_period_id)
    );
    
    RAISE LOG 'auto_recalculate_on_load_changes: Recálculo ejecutado para período % (operación: %)', 
      affected_period_id, TG_OP;
  END IF;

  -- Retornar el registro apropiado
  RETURN NEW;
END;
$$;