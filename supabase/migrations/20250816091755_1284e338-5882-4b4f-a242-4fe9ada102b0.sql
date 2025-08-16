-- FIX ALL CALCULATE_PAYMENT_DATE FUNCTION VARIANTS

-- Drop all existing versions of calculate_payment_date
DROP FUNCTION IF EXISTS public.calculate_payment_date(date, text);
DROP FUNCTION IF EXISTS public.calculate_payment_date(uuid, date);

-- Recreate the first version with proper search_path
CREATE OR REPLACE FUNCTION public.calculate_payment_date(period_end_date date, payment_day text)
RETURNS date
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  target_day_num INTEGER;
  period_end_day_num INTEGER;
  days_to_add INTEGER;
  result_date DATE;
BEGIN
  -- Convertir payment_day a número (1=Monday, 7=Sunday)
  CASE LOWER(payment_day)
    WHEN 'monday' THEN target_day_num := 1;
    WHEN 'tuesday' THEN target_day_num := 2;
    WHEN 'wednesday' THEN target_day_num := 3;
    WHEN 'thursday' THEN target_day_num := 4;
    WHEN 'friday' THEN target_day_num := 5;
    WHEN 'saturday' THEN target_day_num := 6;
    WHEN 'sunday' THEN target_day_num := 7;
    ELSE target_day_num := 5; -- Default: Friday
  END CASE;
  
  -- Obtener día de la semana del period_end_date (1=Monday, 7=Sunday)
  period_end_day_num := EXTRACT(isodow FROM period_end_date);
  
  -- Calcular días a agregar para llegar al próximo payment_day
  days_to_add := (target_day_num - period_end_day_num + 7) % 7;
  
  -- Si el payment_day es el mismo día que period_end_date, usar la semana siguiente
  IF days_to_add = 0 THEN
    days_to_add := 7;
  END IF;
  
  result_date := period_end_date + days_to_add;
  
  RETURN result_date;
END;
$$;

-- Recreate the second version with proper search_path
CREATE OR REPLACE FUNCTION public.calculate_payment_date(company_id_param uuid, target_date date DEFAULT CURRENT_DATE)
RETURNS date
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  payment_day_val text;
  payment_frequency_val text;
  cycle_start_day_val integer;
  calculated_date date;
BEGIN
  -- Get company payment settings
  SELECT 
    COALESCE(payment_day, 'friday'),
    COALESCE(default_payment_frequency, 'weekly'),
    COALESCE(payment_cycle_start_day, 1)
  INTO 
    payment_day_val,
    payment_frequency_val,
    cycle_start_day_val
  FROM companies
  WHERE id = company_id_param;
  
  -- If company not found, return null
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  
  -- Calculate based on frequency
  CASE payment_frequency_val
    WHEN 'weekly' THEN
      -- Find next occurrence of payment_day
      calculated_date := target_date + (
        CASE payment_day_val
          WHEN 'monday' THEN 1
          WHEN 'tuesday' THEN 2
          WHEN 'wednesday' THEN 3
          WHEN 'thursday' THEN 4
          WHEN 'friday' THEN 5
          WHEN 'saturday' THEN 6
          WHEN 'sunday' THEN 0
          ELSE 5 -- default to friday
        END - EXTRACT(DOW FROM target_date)::integer + 7
      ) % 7;
      
      -- If same day, move to next week
      IF calculated_date = target_date THEN
        calculated_date := calculated_date + 7;
      END IF;
    
    WHEN 'biweekly' THEN
      -- Similar logic but every 2 weeks
      calculated_date := target_date + 14;
    
    WHEN 'monthly' THEN
      -- Use cycle_start_day as the day of month
      calculated_date := date_trunc('month', target_date) + interval '1 month' + (cycle_start_day_val - 1);
    
    ELSE
      -- Default to weekly friday
      calculated_date := target_date + (5 - EXTRACT(DOW FROM target_date)::integer + 7) % 7;
  END CASE;
  
  RETURN calculated_date;
END;
$$;