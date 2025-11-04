-- Función para actualizar directamente el payment_period_id de cargas específicas
CREATE OR REPLACE FUNCTION public.update_load_payment_period_directly(
  p_load_ids UUID[],
  p_new_period_id UUID
)
RETURNS TABLE (
  load_number TEXT,
  old_period_id UUID,
  new_period_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  UPDATE loads
  SET payment_period_id = p_new_period_id
  WHERE id = ANY(p_load_ids)
  RETURNING 
    loads.load_number,
    NULL::UUID as old_period_id,  -- No podemos capturar el valor anterior
    loads.payment_period_id as new_period_id;
END;
$$;