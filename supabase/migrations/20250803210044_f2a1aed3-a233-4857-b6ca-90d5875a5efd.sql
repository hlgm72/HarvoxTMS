-- Remove more unused indexes - focusing on clearly unused functionality
-- Note: Keeping foreign key indexes we just added as they may be used in future queries

-- Drop Geotab related indexes (feature not implemented)
DROP INDEX IF EXISTS idx_vehicle_assignments_driver_id;
DROP INDEX IF EXISTS idx_vehicle_assignments_vehicle_id;

-- Drop equipment location indexes (limited functionality)
DROP INDEX IF EXISTS idx_equipment_locations_equipment_id;
DROP INDEX IF EXISTS idx_equipment_locations_reported_at;
DROP INDEX IF EXISTS idx_equipment_locations_current;

-- Drop created_at/updated_at indexes (rarely used for filtering)
DROP INDEX IF EXISTS idx_loads_created_at;
DROP INDEX IF EXISTS idx_loads_updated_at;
DROP INDEX IF EXISTS idx_fuel_expenses_created_at;
DROP INDEX IF EXISTS idx_company_equipment_created_at;

-- Drop company/equipment document indexes that are not used
DROP INDEX IF EXISTS idx_company_documents_type_active;
DROP INDEX IF EXISTS idx_company_documents_active;
DROP INDEX IF EXISTS idx_equipment_documents_type;
DROP INDEX IF EXISTS idx_equipment_documents_expiry;
DROP INDEX IF EXISTS idx_equipment_documents_current;

-- Drop equipment specific indexes not used in searches
DROP INDEX IF EXISTS idx_company_equipment_license_plate;
DROP INDEX IF EXISTS idx_company_equipment_vin;

-- Drop location-based company indexes
DROP INDEX IF EXISTS idx_companies_city_id;
DROP INDEX IF EXISTS idx_companies_state_id;