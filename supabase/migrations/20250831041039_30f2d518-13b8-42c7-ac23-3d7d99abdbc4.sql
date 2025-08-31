-- Eliminar y recrear funciones que contienen referencias incorrectas a "payment_periods"

-- 1. Eliminar función existente con parámetros incorrectos
DROP FUNCTION IF EXISTS public.auto_assign_payment_period_to_load(date, uuid);

-- 2. Crear función auxiliar corregida
CREATE OR REPLACE FUNCTION public.auto_assign_payment_period_to_load(
  delivery_date_param DATE,
  company_id_param UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  period_id UUID;
BEGIN
  -- Buscar un período existente que contenga la fecha de entrega
  SELECT id INTO period_id
  FROM company_payment_periods cpp
  WHERE cpp.company_id = company_id_param
    AND cpp.period_start_date <= delivery_date_param
    AND cpp.period_end_date >= delivery_date_param
    AND cpp.status IN ('open', 'processing')
  ORDER BY cpp.period_start_date DESC
  LIMIT 1;
  
  -- Si encontramos un período, devolverlo
  IF period_id IS NOT NULL THEN
    RETURN period_id;
  END IF;
  
  -- Si no encontramos ningún período, crear uno nuevo usando la función existente
  RETURN create_payment_period_if_needed(company_id_param, delivery_date_param);
  
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'Error auto-asignando período de pago: %', SQLERRM;
  RETURN NULL;
END;
$function$;