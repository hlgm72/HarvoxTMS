-- Additional database optimizations based on analysis

-- 1. Add indexes for frequently scanned tables
-- user_company_roles has high sequential scans, add composite index for common lookups
CREATE INDEX IF NOT EXISTS idx_user_company_roles_user_active 
ON public.user_company_roles(user_id, is_active);

-- 2. Add index for profiles table (high sequential scans)
CREATE INDEX IF NOT EXISTS idx_profiles_user_id 
ON public.profiles(user_id);

-- 3. Add indexes for loads table performance
CREATE INDEX IF NOT EXISTS idx_loads_created_at 
ON public.loads(created_at);

CREATE INDEX IF NOT EXISTS idx_loads_updated_at 
ON public.loads(updated_at);

-- 4. Add indexes for fuel_expenses date filtering
CREATE INDEX IF NOT EXISTS idx_fuel_expenses_created_at 
ON public.fuel_expenses(created_at);

-- 5. Add indexes for equipment tracking
CREATE INDEX IF NOT EXISTS idx_company_equipment_created_at 
ON public.company_equipment(created_at);

-- 6. Add index for payment period lookups
CREATE INDEX IF NOT EXISTS idx_company_payment_periods_locked 
ON public.company_payment_periods(is_locked);

-- 7. Add index for driver period calculations status
CREATE INDEX IF NOT EXISTS idx_driver_period_calculations_status 
ON public.driver_period_calculations(payment_status);

-- 8. Optimize equipment locations for GPS tracking
CREATE INDEX IF NOT EXISTS idx_equipment_locations_current 
ON public.equipment_locations(is_current, reported_at);

-- 9. Add spatial index for equipment locations if using PostGIS
-- CREATE INDEX IF NOT EXISTS idx_equipment_locations_spatial 
-- ON public.equipment_locations USING GIST(ST_Point(longitude, latitude));

-- 10. Add index for document filtering
CREATE INDEX IF NOT EXISTS idx_company_documents_type_active 
ON public.company_documents(document_type, is_active);