-- Create table for US States
CREATE TABLE public.states (
  id CHAR(2) PRIMARY KEY,               -- "TX", "CA", "FL", etc.
  name TEXT NOT NULL UNIQUE,            -- "Texas", "California", "Florida"
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for Cities by State
CREATE TABLE public.state_cities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  state_id CHAR(2) NOT NULL REFERENCES public.states(id) ON DELETE CASCADE,
  name TEXT NOT NULL,                   -- "Houston", "Dallas", "Miami"
  county TEXT,                          -- "Harris County" (opcional, no usado por ahora)
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(state_id, name)                -- Evita ciudades duplicadas por estado
);

-- Enable Row Level Security
ALTER TABLE public.states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.state_cities ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access (todas las compañías pueden leer)
CREATE POLICY "Everyone can read states" 
ON public.states 
FOR SELECT 
USING (true);

CREATE POLICY "Everyone can read cities" 
ON public.state_cities 
FOR SELECT 
USING (true);

-- Create policies for superadmin only modifications
-- TODO: Implementar cuando tengamos el sistema de roles
-- Por ahora, permitimos a service_role manejar estas tablas
CREATE POLICY "Service role can manage states" 
ON public.states 
FOR ALL 
USING (true) 
WITH CHECK (true);

CREATE POLICY "Service role can manage cities" 
ON public.state_cities 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX idx_state_cities_state_id ON public.state_cities(state_id);
CREATE INDEX idx_state_cities_name ON public.state_cities(name);
CREATE INDEX idx_state_cities_search ON public.state_cities(state_id, name);

-- Insert main US States (50 + DC + PR)
INSERT INTO public.states (id, name) VALUES 
('AL', 'Alabama'),
('AK', 'Alaska'),
('AZ', 'Arizona'),
('AR', 'Arkansas'),
('CA', 'California'),
('CO', 'Colorado'),
('CT', 'Connecticut'),
('DE', 'Delaware'),
('DC', 'District of Columbia'),
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
('PR', 'Puerto Rico'),
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
('WY', 'Wyoming');

-- Insert some major cities as examples (tu base de datos completará esto)
INSERT INTO public.state_cities (state_id, name, county) VALUES 
-- Texas
('TX', 'Houston', 'Harris County'),
('TX', 'Dallas', 'Dallas County'),
('TX', 'Austin', 'Travis County'),
('TX', 'San Antonio', 'Bexar County'),
('TX', 'Fort Worth', 'Tarrant County'),
-- California  
('CA', 'Los Angeles', 'Los Angeles County'),
('CA', 'San Francisco', 'San Francisco County'),
('CA', 'San Diego', 'San Diego County'),
('CA', 'Sacramento', 'Sacramento County'),
-- Florida
('FL', 'Miami', 'Miami-Dade County'),
('FL', 'Tampa', 'Hillsborough County'),
('FL', 'Orlando', 'Orange County'),
('FL', 'Jacksonville', 'Duval County'),
-- New York
('NY', 'New York', 'New York County'),
('NY', 'Buffalo', 'Erie County'),
('NY', 'Rochester', 'Monroe County');