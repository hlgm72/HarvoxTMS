-- Make station_state required in fuel_expenses table
ALTER TABLE public.fuel_expenses 
ALTER COLUMN station_state SET NOT NULL;