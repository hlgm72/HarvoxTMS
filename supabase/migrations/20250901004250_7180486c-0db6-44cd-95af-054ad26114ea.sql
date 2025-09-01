-- ============================================================================
-- 🔒 PROTECCIÓN DE INTEGRIDAD FINANCIERA POR CONDUCTOR INDIVIDUAL
-- Cuando un conductor se marca como 'paid', sus datos se vuelven inmutables
-- ============================================================================

-- Función para verificar si un conductor específico está pagado en un período
CREATE OR REPLACE FUNCTION public.is_driver_paid_in_period(
  target_driver_user_id UUID, 
  target_period_id UUID
) RETURNS BOOLEAN
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(
    (SELECT payment_status = 'paid'
     FROM driver_period_calculations dpc
     WHERE dpc.driver_user_id = target_driver_user_id
     AND dpc.company_payment_period_id = target_period_id), 
    false
  );
$$;

-- Función para verificar protección completa (período bloqueado O conductor pagado)
CREATE OR REPLACE FUNCTION public.is_financial_data_protected(
  target_driver_user_id UUID, 
  target_period_id UUID
) RETURNS BOOLEAN
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    -- El período está completamente bloqueado O el conductor específico está pagado
    COALESCE(is_payment_period_locked(target_period_id), false) OR 
    COALESCE(is_driver_paid_in_period(target_driver_user_id, target_period_id), false);
$$;