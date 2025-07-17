-- Agregar campos de fecha a la tabla loads
ALTER TABLE public.loads 
ADD COLUMN pickup_date DATE,
ADD COLUMN delivery_date DATE;

-- Crear función actualizada para asignar período de pago
CREATE OR REPLACE FUNCTION public.assign_payment_period_to_load()
RETURNS TRIGGER AS $$
DECLARE
  target_date DATE;
  calculated_period_id UUID;
BEGIN
  -- Usar pickup_date si está disponible, sino usar la fecha actual
  target_date := COALESCE(NEW.pickup_date, CURRENT_DATE);
  
  -- Obtener el período de pago apropiado
  SELECT public.get_current_payment_period(NEW.driver_user_id, target_date) 
  INTO calculated_period_id;
  
  -- Asignar el período a la carga
  NEW.payment_period_id := calculated_period_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

-- Crear función actualizada para cambios de fecha
CREATE OR REPLACE FUNCTION public.update_payment_period_on_date_change()
RETURNS TRIGGER AS $$
DECLARE
  target_date DATE;
  calculated_period_id UUID;
BEGIN
  -- Solo recalcular si cambió la fecha de pickup o el conductor
  IF (OLD.pickup_date IS DISTINCT FROM NEW.pickup_date) OR 
     (OLD.driver_user_id IS DISTINCT FROM NEW.driver_user_id) THEN
    
    target_date := COALESCE(NEW.pickup_date, CURRENT_DATE);
    
    SELECT public.get_current_payment_period(NEW.driver_user_id, target_date) 
    INTO calculated_period_id;
    
    NEW.payment_period_id := calculated_period_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

-- Crear triggers para la tabla loads
DROP TRIGGER IF EXISTS trigger_assign_payment_period ON public.loads;
DROP TRIGGER IF EXISTS trigger_update_payment_period ON public.loads;

CREATE TRIGGER trigger_assign_payment_period
    BEFORE INSERT ON public.loads
    FOR EACH ROW
    EXECUTE FUNCTION public.assign_payment_period_to_load();

CREATE TRIGGER trigger_update_payment_period
    BEFORE UPDATE ON public.loads
    FOR EACH ROW
    EXECUTE FUNCTION public.update_payment_period_on_date_change();