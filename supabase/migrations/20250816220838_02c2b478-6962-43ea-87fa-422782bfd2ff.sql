-- COMPREHENSIVE SECURITY FIX: Enable RLS and create policies for all exposed tables
-- This addresses all 5 critical security findings in one migration

-- 1. Secure company_client_contacts table
ALTER TABLE company_client_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company_client_contacts_company_members_only"
ON company_client_contacts
FOR ALL
TO authenticated
USING (
  client_id IN (
    SELECT cc.id 
    FROM company_clients cc
    JOIN user_company_roles ucr ON cc.company_id = ucr.company_id
    WHERE ucr.user_id = (SELECT auth.uid()) 
    AND ucr.is_active = true
  )
)
WITH CHECK (
  client_id IN (
    SELECT cc.id 
    FROM company_clients cc
    JOIN user_company_roles ucr ON cc.company_id = ucr.company_id
    WHERE ucr.user_id = (SELECT auth.uid()) 
    AND ucr.is_active = true
  )
);

-- 2. Secure driver_profiles table  
ALTER TABLE driver_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "driver_profiles_secure_access"
ON driver_profiles
FOR ALL
TO authenticated
USING (
  -- Users can see their own profile
  user_id = (SELECT auth.uid())
  OR
  -- Company admins can see profiles of their company drivers
  user_id IN (
    SELECT ucr1.user_id
    FROM user_company_roles ucr1
    WHERE ucr1.company_id IN (
      SELECT ucr2.company_id
      FROM user_company_roles ucr2
      WHERE ucr2.user_id = (SELECT auth.uid())
      AND ucr2.is_active = true
      AND ucr2.role IN ('company_owner', 'operations_manager', 'superadmin')
    )
    AND ucr1.is_active = true
  )
)
WITH CHECK (
  -- Users can update their own profile
  user_id = (SELECT auth.uid())
  OR
  -- Company admins can update profiles of their company drivers
  user_id IN (
    SELECT ucr1.user_id
    FROM user_company_roles ucr1
    WHERE ucr1.company_id IN (
      SELECT ucr2.company_id
      FROM user_company_roles ucr2
      WHERE ucr2.user_id = (SELECT auth.uid())
      AND ucr2.is_active = true
      AND ucr2.role IN ('company_owner', 'operations_manager', 'superadmin')
    )
    AND ucr1.is_active = true
  )
);

-- 3. Secure company_owner_details table
ALTER TABLE company_owner_details ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company_owner_details_owners_and_superadmin_only"
ON company_owner_details
FOR ALL
TO authenticated
USING (
  -- Company owners can see their own company details
  company_id IN (
    SELECT ucr.company_id
    FROM user_company_roles ucr
    WHERE ucr.user_id = (SELECT auth.uid())
    AND ucr.is_active = true
    AND ucr.role = 'company_owner'
  )
  OR
  -- Superadmins can see all company owner details
  EXISTS (
    SELECT 1
    FROM user_company_roles ucr
    WHERE ucr.user_id = (SELECT auth.uid())
    AND ucr.is_active = true
    AND ucr.role = 'superadmin'
  )
)
WITH CHECK (
  -- Company owners can modify their own company details
  company_id IN (
    SELECT ucr.company_id
    FROM user_company_roles ucr
    WHERE ucr.user_id = (SELECT auth.uid())
    AND ucr.is_active = true
    AND ucr.role = 'company_owner'
  )
  OR
  -- Superadmins can modify all company owner details
  EXISTS (
    SELECT 1
    FROM user_company_roles ucr
    WHERE ucr.user_id = (SELECT auth.uid())
    AND ucr.is_active = true
    AND ucr.role = 'superadmin'
  )
);

-- 4. Create profiles table if it doesn't exist and secure it
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  address TEXT,
  date_of_birth DATE,
  hire_date DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_users_and_company_admins_access"
ON profiles
FOR ALL
TO authenticated
USING (
  -- Users can see their own profile
  user_id = (SELECT auth.uid())
  OR
  -- Company admins can see profiles of their company members
  user_id IN (
    SELECT ucr1.user_id
    FROM user_company_roles ucr1
    WHERE ucr1.company_id IN (
      SELECT ucr2.company_id
      FROM user_company_roles ucr2
      WHERE ucr2.user_id = (SELECT auth.uid())
      AND ucr2.is_active = true
      AND ucr2.role IN ('company_owner', 'operations_manager', 'superadmin')
    )
    AND ucr1.is_active = true
  )
)
WITH CHECK (
  -- Users can update their own profile
  user_id = (SELECT auth.uid())
  OR
  -- Company admins can update profiles of their company members
  user_id IN (
    SELECT ucr1.user_id
    FROM user_company_roles ucr1
    WHERE ucr1.company_id IN (
      SELECT ucr2.company_id
      FROM user_company_roles ucr2
      WHERE ucr2.user_id = (SELECT auth.uid())
      AND ucr2.is_active = true
      AND ucr2.role IN ('company_owner', 'operations_manager', 'superadmin')
    )
    AND ucr1.is_active = true
  )
);

-- 5. Create password_reset_tokens table if it doesn't exist and secure it
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "password_reset_tokens_owner_only"
ON password_reset_tokens
FOR ALL
TO authenticated
USING (
  -- Users can only see their own password reset tokens
  user_id = (SELECT auth.uid())
)
WITH CHECK (
  -- Users can only create/update their own password reset tokens
  user_id = (SELECT auth.uid())
);

-- Create service role policy for password reset tokens (for system operations)
CREATE POLICY "password_reset_tokens_service_role"
ON password_reset_tokens
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Add triggers for updated_at timestamps where needed
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add update triggers for profiles if column exists
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'updated_at') THEN
    DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
    CREATE TRIGGER update_profiles_updated_at
      BEFORE UPDATE ON profiles
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;