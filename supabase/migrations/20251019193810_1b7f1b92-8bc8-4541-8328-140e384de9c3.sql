-- Corregir get_week_of_month para eliminar warning de seguridad
CREATE OR REPLACE FUNCTION get_week_of_month(check_date date)
RETURNS integer
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN CEIL(EXTRACT(DAY FROM check_date)::numeric / 7);
END;
$$;