-- Crear función de validación para prevenir creación masiva
CREATE OR REPLACE FUNCTION public.validate_period_creation_policy()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  periods_created_today INTEGER;
  company_id_check UUID;
BEGIN
  -- Obtener company_id del nuevo período
  company_id_check := NEW.company_id;
  
  -- Contar períodos creados hoy para esta empresa
  SELECT COUNT(*) INTO periods_created_today
  FROM company_payment_periods
  WHERE company_id = company_id_check
  AND DATE(created_at) = CURRENT_DATE;
  
  -- ⚠️ ALERTA: Si se crean más de 3 períodos en un día, algo está mal
  IF periods_created_today > 3 THEN
    RAISE WARNING '🚨 ALERTA: Se han creado % períodos hoy para empresa %. Posible creación masiva detectada!', 
      periods_created_today, company_id_check;
    
    -- Registrar en logs para monitoreo
    INSERT INTO public.system_alerts (
      alert_type,
      message,
      company_id,
      created_at
    ) VALUES (
      'MASS_PERIOD_CREATION',
      format('Creados %s períodos en un día para empresa %s', periods_created_today, company_id_check),
      company_id_check,
      now()
    ) ON CONFLICT DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Crear tabla de alertas si no existe
CREATE TABLE IF NOT EXISTS public.system_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type TEXT NOT NULL,
  message TEXT NOT NULL,
  company_id UUID,
  resolved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  resolved_at TIMESTAMP WITH TIME ZONE
);

-- Crear trigger de validación
DROP TRIGGER IF EXISTS validate_period_creation ON company_payment_periods;
CREATE TRIGGER validate_period_creation
  AFTER INSERT ON company_payment_periods
  FOR EACH ROW 
  EXECUTE FUNCTION validate_period_creation_policy();