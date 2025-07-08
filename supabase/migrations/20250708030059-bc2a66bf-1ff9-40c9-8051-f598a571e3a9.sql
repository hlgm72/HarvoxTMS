-- Update RLS policies to allow service role to insert/update data for sync operations

-- Allow service role to insert vehicles
CREATE POLICY "Allow service role to manage vehicles" 
ON public.vehicles 
FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);

-- Allow service role to insert vehicle positions
CREATE POLICY "Allow service role to manage vehicle positions" 
ON public.vehicle_positions 
FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);

-- Allow service role to insert drivers
CREATE POLICY "Allow service role to manage drivers" 
ON public.drivers 
FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);

-- Allow service role to insert vehicle assignments
CREATE POLICY "Allow service role to manage vehicle assignments" 
ON public.vehicle_assignments 
FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);