-- Función para forzar recálculo del payment_period_id de cargas específicas
CREATE OR REPLACE FUNCTION public.force_recalculate_load_payment_period(
  p_load_ids UUID[]
)
RETURNS TABLE (
  load_number TEXT,
  old_period_id UUID,
  new_period_id UUID,
  pickup_date DATE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  UPDATE loads
  SET pickup_date = pickup_date  -- Trigger se dispara al actualizar
  WHERE id = ANY(p_load_ids)
  RETURNING 
    loads.load_number,
    NULL::UUID as old_period_id,  -- No podemos obtener el valor anterior en RETURNING
    loads.payment_period_id as new_period_id,
    loads.pickup_date;
END;
$$;

COMMENT ON FUNCTION public.force_recalculate_load_payment_period(UUID[]) IS 
  'Fuerza el recálculo del payment_period_id de cargas específicas actualizando sus fechas';