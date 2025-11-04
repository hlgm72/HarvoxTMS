-- Eliminar función anterior y recrearla correctamente
DROP FUNCTION IF EXISTS public.force_recalculate_load_payment_period(UUID[]);

CREATE OR REPLACE FUNCTION public.force_recalculate_load_payment_period(
  p_load_ids UUID[]
)
RETURNS TABLE (
  load_number TEXT,
  old_period_id UUID,
  new_period_id UUID,
  pickup_date_value DATE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  UPDATE loads l
  SET pickup_date = l.pickup_date  -- Trigger se dispara al actualizar
  WHERE l.id = ANY(p_load_ids)
  RETURNING 
    l.load_number,
    NULL::UUID,
    l.payment_period_id,
    l.pickup_date;
END;
$$;