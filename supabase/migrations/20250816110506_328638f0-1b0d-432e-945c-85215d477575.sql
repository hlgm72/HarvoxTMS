-- Performance optimizations - Core tables only

-- 1. Indexes for user_company_roles (most queried table)
CREATE INDEX IF NOT EXISTS idx_user_company_roles_user_active 
ON user_company_roles (user_id, is_active) 
WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_user_company_roles_company_role_active 
ON user_company_roles (company_id, role, is_active) 
WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_user_company_roles_lookup 
ON user_company_roles (user_id, company_id, is_active);

-- 2. Indexes for profiles table
CREATE INDEX IF NOT EXISTS idx_profiles_user_id 
ON profiles (user_id);

-- 3. Indexes for driver_profiles table
CREATE INDEX IF NOT EXISTS idx_driver_profiles_user_active 
ON driver_profiles (user_id) 
WHERE is_active = true;

-- 4. Index for driver_period_calculations
CREATE INDEX IF NOT EXISTS idx_driver_period_calculations_period 
ON driver_period_calculations (company_payment_period_id);