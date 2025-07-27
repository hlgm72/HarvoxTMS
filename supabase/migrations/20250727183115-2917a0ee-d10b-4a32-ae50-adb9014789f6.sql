-- Crear tabla de estados de Estados Unidos
CREATE TABLE us_states (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Crear tabla de condados
CREATE TABLE us_counties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  state_id TEXT NOT NULL REFERENCES us_states(id),
  fips_code TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(name, state_id)
);

-- Crear tabla de ciudades con referencia a condado
CREATE TABLE us_cities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  state_id TEXT NOT NULL REFERENCES us_states(id),
  county_id UUID REFERENCES us_counties(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(name, state_id)
);

-- Crear tabla de códigos ZIP con tipos
CREATE TABLE zip_codes (
  zip TEXT PRIMARY KEY,
  preferred_city_id UUID REFERENCES us_cities(id),
  zip_type TEXT CHECK (zip_type IN ('Standard', 'PO Box', 'Unique')),
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Crear tabla de enlaces ZIP-Ciudad
CREATE TABLE zip_city_links (
  zip TEXT REFERENCES zip_codes(zip),
  city_id UUID REFERENCES us_cities(id),
  is_preferred BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY (zip, city_id)
);

-- Crear índices para optimizar consultas
CREATE INDEX idx_us_counties_state_id ON us_counties(state_id);
CREATE INDEX idx_us_counties_fips_code ON us_counties(fips_code);
CREATE INDEX idx_us_cities_state_id ON us_cities(state_id);
CREATE INDEX idx_us_cities_county_id ON us_cities(county_id);
CREATE INDEX idx_zip_codes_preferred_city_id ON zip_codes(preferred_city_id);
CREATE INDEX idx_zip_codes_coordinates ON zip_codes(latitude, longitude);
CREATE INDEX idx_zip_city_links_is_preferred ON zip_city_links(is_preferred);

-- Habilitar RLS en todas las tablas
ALTER TABLE us_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE us_counties ENABLE ROW LEVEL SECURITY;
ALTER TABLE us_cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE zip_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE zip_city_links ENABLE ROW LEVEL SECURITY;

-- Políticas RLS - estas tablas son de referencia pública
CREATE POLICY "Anyone can read US states" ON us_states FOR SELECT USING (true);
CREATE POLICY "Anyone can read US counties" ON us_counties FOR SELECT USING (true);
CREATE POLICY "Anyone can read US cities" ON us_cities FOR SELECT USING (true);
CREATE POLICY "Anyone can read ZIP codes" ON zip_codes FOR SELECT USING (true);
CREATE POLICY "Anyone can read ZIP city links" ON zip_city_links FOR SELECT USING (true);

-- Solo service role puede modificar estas tablas de referencia
CREATE POLICY "Service role can modify US states" ON us_states FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role can modify US counties" ON us_counties FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role can modify US cities" ON us_cities FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role can modify ZIP codes" ON zip_codes FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role can modify ZIP city links" ON zip_city_links FOR ALL USING (auth.role() = 'service_role');

-- Insertar algunos estados de ejemplo para comenzar
INSERT INTO us_states (id, name) VALUES 
('AL', 'Alabama'),
('AK', 'Alaska'),
('AZ', 'Arizona'),
('AR', 'Arkansas'),
('CA', 'California'),
('CO', 'Colorado'),
('CT', 'Connecticut'),
('DE', 'Delaware'),
('FL', 'Florida'),
('GA', 'Georgia'),
('HI', 'Hawaii'),
('ID', 'Idaho'),
('IL', 'Illinois'),
('IN', 'Indiana'),
('IA', 'Iowa'),
('KS', 'Kansas'),
('KY', 'Kentucky'),
('LA', 'Louisiana'),
('ME', 'Maine'),
('MD', 'Maryland'),
('MA', 'Massachusetts'),
('MI', 'Michigan'),
('MN', 'Minnesota'),
('MS', 'Mississippi'),
('MO', 'Missouri'),
('MT', 'Montana'),
('NE', 'Nebraska'),
('NV', 'Nevada'),
('NH', 'New Hampshire'),
('NJ', 'New Jersey'),
('NM', 'New Mexico'),
('NY', 'New York'),
('NC', 'North Carolina'),
('ND', 'North Dakota'),
('OH', 'Ohio'),
('OK', 'Oklahoma'),
('OR', 'Oregon'),
('PA', 'Pennsylvania'),
('RI', 'Rhode Island'),
('SC', 'South Carolina'),
('SD', 'South Dakota'),
('TN', 'Tennessee'),
('TX', 'Texas'),
('UT', 'Utah'),
('VT', 'Vermont'),
('VA', 'Virginia'),
('WA', 'Washington'),
('WV', 'West Virginia'),
('WI', 'Wisconsin'),
('WY', 'Wyoming'),
('DC', 'District of Columbia');

-- Función para actualizar timestamps automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para actualizar timestamps
CREATE TRIGGER update_us_states_updated_at BEFORE UPDATE ON us_states FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_us_counties_updated_at BEFORE UPDATE ON us_counties FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_us_cities_updated_at BEFORE UPDATE ON us_cities FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_zip_codes_updated_at BEFORE UPDATE ON zip_codes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();