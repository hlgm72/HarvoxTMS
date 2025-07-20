-- Actualizar las cargas existentes con fechas por defecto para que se asignen a períodos
UPDATE public.loads 
SET 
  pickup_date = CURRENT_DATE,
  delivery_date = CURRENT_DATE + 1,
  updated_at = now()
WHERE pickup_date IS NULL 
  AND delivery_date IS NULL
  AND payment_period_id IS NULL;