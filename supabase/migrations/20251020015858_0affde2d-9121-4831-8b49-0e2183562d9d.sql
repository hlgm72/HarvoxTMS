-- Corregir get_week_of_month para calcular correctamente la semana del mes
-- basándose en semanas calendario reales (lunes a domingo)

CREATE OR REPLACE FUNCTION get_week_of_month(check_date date)
RETURNS integer
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  first_day_of_month date;
  first_week_start date;
  days_diff integer;
  week_number integer;
BEGIN
  -- Obtener el primer día del mes
  first_day_of_month := date_trunc('month', check_date)::date;
  
  -- Obtener el lunes de la primera semana del mes
  -- (puede ser del mes anterior si el mes no empieza en lunes)
  first_week_start := date_trunc('week', first_day_of_month)::date;
  
  -- Calcular cuántas semanas han pasado desde el inicio de la primera semana del mes
  days_diff := check_date - first_week_start;
  week_number := (days_diff / 7) + 1;
  
  -- Limitar a un máximo de 5 semanas por mes
  -- (un mes puede tener máximo 5 semanas si empieza en sábado/domingo)
  RETURN LEAST(week_number, 5);
END;
$$;

COMMENT ON FUNCTION get_week_of_month IS 
'Calcula la semana del mes (1-5) basándose en semanas calendario (lunes-domingo).
La semana 1 es la primera semana que contiene días del mes, incluso si empieza en el mes anterior.';