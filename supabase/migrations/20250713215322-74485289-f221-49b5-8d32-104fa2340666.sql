-- Rename vehicle-related tables to include geotab prefix for clarity

-- First, rename the main vehicles table
ALTER TABLE public.vehicles RENAME TO geotab_vehicles;

-- Rename vehicle_positions table
ALTER TABLE public.vehicle_positions RENAME TO geotab_vehicle_positions;

-- Rename vehicle_assignments table
ALTER TABLE public.vehicle_assignments RENAME TO geotab_vehicle_assignments;

-- Update foreign key constraints to reflect the new table names
-- The foreign keys will automatically update to point to the renamed tables

-- Add comments to clarify the purpose of each table
COMMENT ON TABLE public.geotab_vehicles IS 'Vehicle information synchronized from Geotab fleet management system';
COMMENT ON TABLE public.geotab_vehicle_positions IS 'Real-time GPS positions and telemetry data from Geotab devices';
COMMENT ON TABLE public.geotab_vehicle_assignments IS 'Driver assignments to vehicles managed through Geotab system';
COMMENT ON TABLE public.geotab_drivers IS 'Driver information synchronized from Geotab fleet management system';