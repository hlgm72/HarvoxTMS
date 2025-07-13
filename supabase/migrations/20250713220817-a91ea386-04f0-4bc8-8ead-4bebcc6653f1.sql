-- Fix index names to match the new table names

-- Rename indexes for geotab_vehicles table
ALTER INDEX public.vehicles_pkey RENAME TO geotab_vehicles_pkey;
ALTER INDEX public.vehicles_geotab_id_key RENAME TO geotab_vehicles_geotab_id_key;

-- Check if there are any other old indexes and rename them
-- For vehicle_positions (now geotab_vehicle_positions)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'vehicle_positions_pkey') THEN
        ALTER INDEX public.vehicle_positions_pkey RENAME TO geotab_vehicle_positions_pkey;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'vehicle_positions_vehicle_id_idx') THEN
        ALTER INDEX public.vehicle_positions_vehicle_id_idx RENAME TO geotab_vehicle_positions_vehicle_id_idx;
    END IF;
END $$;

-- For vehicle_assignments (now geotab_vehicle_assignments)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'vehicle_assignments_pkey') THEN
        ALTER INDEX public.vehicle_assignments_pkey RENAME TO geotab_vehicle_assignments_pkey;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'vehicle_assignments_vehicle_id_idx') THEN
        ALTER INDEX public.vehicle_assignments_vehicle_id_idx RENAME TO geotab_vehicle_assignments_vehicle_id_idx;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'vehicle_assignments_driver_id_idx') THEN
        ALTER INDEX public.vehicle_assignments_driver_id_idx RENAME TO geotab_vehicle_assignments_driver_id_idx;
    END IF;
END $$;