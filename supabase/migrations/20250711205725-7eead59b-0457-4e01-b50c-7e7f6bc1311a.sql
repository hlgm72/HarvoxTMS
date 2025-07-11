-- Add default percentage fields to companies table for Owner Operators
ALTER TABLE public.companies 
ADD COLUMN default_factoring_percentage NUMERIC(5,2) DEFAULT 3.00,
ADD COLUMN default_dispatching_percentage NUMERIC(5,2) DEFAULT 5.00,
ADD COLUMN default_leasing_percentage NUMERIC(5,2) DEFAULT 25.00;

-- Add comments to explain the purpose of these fields
COMMENT ON COLUMN public.companies.default_factoring_percentage IS 'Default factoring percentage for new Owner Operators in this company';
COMMENT ON COLUMN public.companies.default_dispatching_percentage IS 'Default dispatching percentage for new Owner Operators in this company';
COMMENT ON COLUMN public.companies.default_leasing_percentage IS 'Default leasing percentage for new Owner Operators in this company';

-- Update the existing trigger function to inherit from company defaults
CREATE OR REPLACE FUNCTION public.inherit_owner_operator_percentages()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  company_defaults RECORD;
BEGIN
  -- Check if this user is an Owner Operator
  IF EXISTS (
    SELECT 1 FROM public.owner_operators 
    WHERE user_id = NEW.driver_user_id AND is_active = true
  ) THEN
    -- Get company default percentages
    SELECT 
      c.default_factoring_percentage,
      c.default_dispatching_percentage,
      c.default_leasing_percentage
    INTO company_defaults
    FROM public.companies c
    JOIN public.user_company_roles ucr ON ucr.company_id = c.id
    WHERE ucr.user_id = NEW.driver_user_id 
    AND ucr.is_active = true
    LIMIT 1;
    
    -- If company defaults exist, use them as fallback for null values
    IF FOUND THEN
      NEW.factoring_percentage := COALESCE(NEW.factoring_percentage, company_defaults.default_factoring_percentage);
      NEW.dispatching_percentage := COALESCE(NEW.dispatching_percentage, company_defaults.default_dispatching_percentage);
      NEW.leasing_percentage := COALESCE(NEW.leasing_percentage, company_defaults.default_leasing_percentage);
    ELSE
      -- Fallback to owner operator specific percentages if no company defaults
      SELECT 
        COALESCE(NEW.factoring_percentage, oo.factoring_percentage),
        COALESCE(NEW.dispatching_percentage, oo.dispatching_percentage),
        COALESCE(NEW.leasing_percentage, oo.leasing_percentage)
      INTO 
        NEW.factoring_percentage,
        NEW.dispatching_percentage,
        NEW.leasing_percentage
      FROM public.owner_operators oo
      WHERE oo.user_id = NEW.driver_user_id AND oo.is_active = true;
    END IF;
  ELSE
    -- If not an Owner Operator, set percentages to NULL
    NEW.factoring_percentage := NULL;
    NEW.dispatching_percentage := NULL;
    NEW.leasing_percentage := NULL;
  END IF;
  
  RETURN NEW;
END;
$function$;