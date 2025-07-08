-- Create table for storing vehicle data from Geotab
CREATE TABLE public.vehicles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  geotab_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  vin TEXT,
  license_plate TEXT,
  make TEXT,
  model TEXT,
  year INTEGER,
  device_serial_number TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for storing real-time vehicle positions
CREATE TABLE public.vehicle_positions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  geotab_device_id TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  speed DOUBLE PRECISION,
  bearing DOUBLE PRECISION,
  odometer DOUBLE PRECISION,
  engine_hours DOUBLE PRECISION,
  date_time TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for driver information
CREATE TABLE public.drivers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  geotab_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  license_number TEXT,
  phone TEXT,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for current vehicle assignments
CREATE TABLE public.vehicle_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Enable Row Level Security
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_assignments ENABLE ROW LEVEL SECURITY;

-- Create policies (for now, allow all authenticated users to read all data)
-- In production, you should restrict based on user roles/permissions
CREATE POLICY "Allow read access to vehicles" ON public.vehicles FOR SELECT USING (true);
CREATE POLICY "Allow read access to vehicle positions" ON public.vehicle_positions FOR SELECT USING (true);
CREATE POLICY "Allow read access to drivers" ON public.drivers FOR SELECT USING (true);
CREATE POLICY "Allow read access to vehicle assignments" ON public.vehicle_assignments FOR SELECT USING (true);

-- Create indexes for better performance
CREATE INDEX idx_vehicles_geotab_id ON public.vehicles(geotab_id);
CREATE INDEX idx_vehicle_positions_vehicle_id ON public.vehicle_positions(vehicle_id);
CREATE INDEX idx_vehicle_positions_date_time ON public.vehicle_positions(date_time DESC);
CREATE INDEX idx_vehicle_assignments_vehicle_id ON public.vehicle_assignments(vehicle_id);
CREATE INDEX idx_vehicle_assignments_driver_id ON public.vehicle_assignments(driver_id);
CREATE INDEX idx_vehicle_assignments_active ON public.vehicle_assignments(is_active);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_vehicles_updated_at
  BEFORE UPDATE ON public.vehicles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_drivers_updated_at
  BEFORE UPDATE ON public.drivers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for vehicle positions
ALTER TABLE public.vehicle_positions REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.vehicle_positions;