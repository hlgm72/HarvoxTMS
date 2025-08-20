-- Fix RLS Enabled No Policy Issues
-- Recreate missing policies for tables that should have them

-- ===============================================
-- 1. CREATE MISSING HELPER FUNCTIONS IF NEEDED
-- ===============================================

CREATE OR REPLACE FUNCTION can_access_customer_contacts(client_id_param uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM company_clients cc
    JOIN user_company_roles ucr ON cc.company_id = ucr.company_id
    WHERE cc.id = client_id_param
    AND ucr.user_id = auth.uid()
    AND ucr.is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION can_access_owner_details(company_id_param uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_company_roles
    WHERE user_id = auth.uid()
    AND company_id = company_id_param
    AND role IN ('company_owner', 'superadmin')
    AND is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION is_user_superadmin_safe(user_id_param uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_company_roles
    WHERE user_id = user_id_param
    AND role = 'superadmin'
    AND is_active = true
  );
$$;

-- ===============================================
-- 2. ARCHIVE_LOGS POLICIES
-- ===============================================

DROP POLICY IF EXISTS "archive_logs_optimized" ON archive_logs;

CREATE POLICY "archive_logs_superadmin_only"
ON archive_logs FOR ALL
TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND NOT COALESCE((auth.jwt()->>'is_anonymous')::boolean, false)
  AND is_user_superadmin_safe(auth.uid())
)
WITH CHECK (
  auth.uid() IS NOT NULL
  AND NOT COALESCE((auth.jwt()->>'is_anonymous')::boolean, false)
  AND is_user_superadmin_safe(auth.uid())
);

-- ===============================================
-- 3. COMPANY_CLIENT_CONTACTS POLICIES
-- ===============================================

DROP POLICY IF EXISTS "customer_contacts_delete_authorized_only" ON company_client_contacts;
DROP POLICY IF EXISTS "customer_contacts_insert_authorized_only" ON company_client_contacts;
DROP POLICY IF EXISTS "customer_contacts_select_authorized_only" ON company_client_contacts;
DROP POLICY IF EXISTS "customer_contacts_update_authorized_only" ON company_client_contacts;

CREATE POLICY "company_client_contacts_select"
ON company_client_contacts FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND NOT COALESCE((auth.jwt()->>'is_anonymous')::boolean, false)
  AND can_access_customer_contacts(client_id)
);

CREATE POLICY "company_client_contacts_insert"
ON company_client_contacts FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
  AND NOT COALESCE((auth.jwt()->>'is_anonymous')::boolean, false)
  AND can_access_customer_contacts(client_id)
);

CREATE POLICY "company_client_contacts_update"
ON company_client_contacts FOR UPDATE
TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND NOT COALESCE((auth.jwt()->>'is_anonymous')::boolean, false)
  AND can_access_customer_contacts(client_id)
)
WITH CHECK (
  auth.uid() IS NOT NULL
  AND NOT COALESCE((auth.jwt()->>'is_anonymous')::boolean, false)
  AND can_access_customer_contacts(client_id)
);

CREATE POLICY "company_client_contacts_delete"
ON company_client_contacts FOR DELETE
TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND NOT COALESCE((auth.jwt()->>'is_anonymous')::boolean, false)
  AND can_access_customer_contacts(client_id)
);

-- ===============================================
-- 4. COMPANY_OWNER_DETAILS POLICIES
-- ===============================================

DROP POLICY IF EXISTS "company_owner_details_ultra_restricted" ON company_owner_details;

CREATE POLICY "company_owner_details_restricted_access"
ON company_owner_details FOR ALL
TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND NOT COALESCE((auth.jwt()->>'is_anonymous')::boolean, false)
  AND can_access_owner_details(company_id)
)
WITH CHECK (
  auth.uid() IS NOT NULL
  AND NOT COALESCE((auth.jwt()->>'is_anonymous')::boolean, false)
  AND can_access_owner_details(company_id)
);