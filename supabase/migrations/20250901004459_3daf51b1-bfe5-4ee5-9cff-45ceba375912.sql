-- ============================================================================
-- 🔒 FUNCIÓN DE VALIDACIÓN MEJORADA - INDIVIDUAL POR CONDUCTOR
-- ============================================================================

-- Función mejorada que valida si se pueden modificar datos financieros considerando el estado individual del conductor
CREATE OR REPLACE FUNCTION public.can_modify_financial_data_with_driver_check(
  period_id UUID,
  driver_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  period_locked BOOLEAN := false;
  driver_paid BOOLEAN := false;
  total_drivers INTEGER := 0;
  paid_drivers INTEGER := 0;
  result JSONB;
BEGIN
  -- Verificar si el período está completamente bloqueado
  SELECT COALESCE(is_locked, false) INTO period_locked
  FROM company_payment_periods
  WHERE id = period_id;
  
  -- Si se especifica un conductor, verificar su estado individual
  IF driver_id IS NOT NULL THEN
    SELECT COALESCE(
      (SELECT payment_status = 'paid' 
       FROM driver_period_calculations dpc 
       WHERE dpc.driver_user_id = driver_id 
       AND dpc.company_payment_period_id = period_id), 
      false
    ) INTO driver_paid;
  END IF;
  
  -- Contar conductores y pagados en el período
  SELECT 
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE payment_status = 'paid') as paid
  INTO total_drivers, paid_drivers
  FROM driver_period_calculations dpc
  WHERE dpc.company_payment_period_id = period_id;
  
  -- Determinar si se puede modificar
  result := jsonb_build_object(
    'can_modify', NOT (period_locked OR driver_paid),
    'is_locked', period_locked,
    'driver_is_paid', driver_paid,
    'paid_drivers', paid_drivers,
    'total_drivers', total_drivers,
    'warning_message', CASE
      WHEN period_locked THEN 'El período está completamente bloqueado'
      WHEN driver_paid THEN 'Este conductor ya ha sido pagado y sus datos están protegidos'
      WHEN paid_drivers > 0 AND NOT period_locked THEN 'Hay conductores pagados en este período - procede con cuidado'
      ELSE 'Los datos se pueden modificar'
    END
  );
  
  RETURN result;
END;
$$;

-- Mantener la función original para compatibilidad hacia atrás
CREATE OR REPLACE FUNCTION public.can_modify_financial_data(period_id UUID)
RETURNS JSONB
LANGUAGE SQL
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT can_modify_financial_data_with_driver_check(period_id, NULL);
$$;