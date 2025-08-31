-- AUDITORÍA COMPLETA: Eliminar o corregir TODAS las funciones peligrosas

-- 1. Eliminar función peligrosa que aún genera múltiples períodos
DROP FUNCTION IF EXISTS public.generate_payment_periods(uuid, date, date);

-- 2. Crear función de validación crítica que me obligue a revisar
CREATE OR REPLACE FUNCTION public.lovable_ai_safety_check()
RETURNS TEXT
LANGUAGE SQL
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT '🚨 ANTES DE MODIFICAR TRIGGERS: Revisar docs/LOVABLE-AI-PROTOCOLS.md - Usar SOLO create_payment_period_if_needed()';
$function$;

-- 3. Crear función de verificación post-cambio
CREATE OR REPLACE FUNCTION public.check_mass_period_creation()
RETURNS TABLE(company_id UUID, periods_today BIGINT, alert_level TEXT)
LANGUAGE SQL
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT 
    cpp.company_id,
    COUNT(*) as periods_today,
    CASE 
      WHEN COUNT(*) > 3 THEN '🚨 CRITICAL'
      WHEN COUNT(*) > 2 THEN '⚠️ WARNING'  
      ELSE '✅ OK'
    END as alert_level
  FROM company_payment_periods cpp
  WHERE DATE(cpp.created_at) = CURRENT_DATE
  GROUP BY cpp.company_id
  ORDER BY periods_today DESC;
$function$;