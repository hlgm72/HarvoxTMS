-- Hacer opcionales los campos de dirección en load_stops
-- para permitir crear cargas sin completar todos los detalles inicialmente

ALTER TABLE load_stops
  ALTER COLUMN address DROP NOT NULL,
  ALTER COLUMN city DROP NOT NULL,
  ALTER COLUMN state DROP NOT NULL;