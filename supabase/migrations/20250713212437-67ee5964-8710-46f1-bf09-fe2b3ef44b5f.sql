-- Rename drivers table to geotab_drivers for clarity
ALTER TABLE public.drivers RENAME TO geotab_drivers;

-- Update any indexes that reference the old table name
ALTER INDEX IF EXISTS drivers_pkey RENAME TO geotab_drivers_pkey;
ALTER INDEX IF EXISTS idx_drivers_geotab_id RENAME TO idx_geotab_drivers_geotab_id;

-- Update RLS policies with new table name
DROP POLICY IF EXISTS "Allow read access to drivers" ON public.geotab_drivers;
DROP POLICY IF EXISTS "Allow service role to manage drivers" ON public.geotab_drivers;

-- Recreate policies with clear naming
CREATE POLICY "Allow read access to geotab drivers" 
ON public.geotab_drivers 
FOR SELECT 
USING (true);

CREATE POLICY "Allow service role to manage geotab drivers" 
ON public.geotab_drivers 
FOR ALL 
USING (true)
WITH CHECK (true);