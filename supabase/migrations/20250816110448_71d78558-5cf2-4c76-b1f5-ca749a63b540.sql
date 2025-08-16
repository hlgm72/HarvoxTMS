-- Performance optimizations - Only for existing tables

-- 1. Add indexes for frequently queried tables that exist
CREATE INDEX IF NOT EXISTS idx_user_company_roles_user_active 
ON user_company_roles (user_id, is_active) 
WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_user_company_roles_company_role_active 
ON user_company_roles (company_id, role, is_active) 
WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_driver_profiles_user_active 
ON driver_profiles (user_id) 
WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_profiles_user_id 
ON profiles (user_id);

CREATE INDEX IF NOT EXISTS idx_company_brokers_company_active 
ON company_brokers (company_id, is_active, name) 
WHERE is_active = true;

-- 2. Add composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_user_company_roles_lookup 
ON user_company_roles (user_id, company_id, is_active);

-- 3. Optimize realtime subscriptions by adding indexes on commonly watched tables
CREATE INDEX IF NOT EXISTS idx_driver_period_calculations_period 
ON driver_period_calculations (company_payment_period_id);

CREATE INDEX IF NOT EXISTS idx_equipment_assignments_driver 
ON equipment_assignments (driver_user_id, is_active) 
WHERE is_active = true;