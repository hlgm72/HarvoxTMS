-- Corregir función normalize_text_case con search_path seguro
CREATE OR REPLACE FUNCTION normalize_text_case(input_text TEXT)
RETURNS TEXT 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF input_text IS NULL OR input_text = '' THEN
    RETURN input_text;
  END IF;
  
  -- Usar INITCAP para capitalizar primera letra de cada palabra
  -- y TRIM para eliminar espacios extra
  RETURN INITCAP(TRIM(input_text));
END;
$$;

-- Corregir función normalize_equipment_text con search_path seguro  
CREATE OR REPLACE FUNCTION normalize_equipment_text()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Normalizar make y model automáticamente
  NEW.make := normalize_text_case(NEW.make);
  NEW.model := normalize_text_case(NEW.model);
  RETURN NEW;
END;
$$;