-- Crear función para normalizar texto (capitalizar primera letra de cada palabra)
CREATE OR REPLACE FUNCTION normalize_text_case(input_text TEXT)
RETURNS TEXT AS $$
BEGIN
  IF input_text IS NULL OR input_text = '' THEN
    RETURN input_text;
  END IF;
  
  -- Usar INITCAP para capitalizar primera letra de cada palabra
  -- y TRIM para eliminar espacios extra
  RETURN INITCAP(TRIM(input_text));
END;
$$ LANGUAGE plpgsql;

-- Crear función trigger para normalizar campos de equipment
CREATE OR REPLACE FUNCTION normalize_equipment_text()
RETURNS TRIGGER AS $$
BEGIN
  -- Normalizar make y model automáticamente
  NEW.make := normalize_text_case(NEW.make);
  NEW.model := normalize_text_case(NEW.model);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger que se ejecuta antes de INSERT y UPDATE
CREATE TRIGGER normalize_equipment_before_insert_update
  BEFORE INSERT OR UPDATE ON company_equipment
  FOR EACH ROW
  EXECUTE FUNCTION normalize_equipment_text();

-- Actualizar datos existentes para normalizar
UPDATE company_equipment 
SET 
  make = INITCAP(TRIM(make)),
  model = INITCAP(TRIM(model))
WHERE make IS NOT NULL OR model IS NOT NULL;