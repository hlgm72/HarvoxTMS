-- Fix critical security issue: Missing/broken function causes RLS policies to fail
-- This allows public access to sensitive customer contact information

-- Drop the existing function that might have wrong signature
DROP FUNCTION IF EXISTS public.can_access_customer_contacts(uuid);

-- Create the correct security function that RLS policies depend on
CREATE OR REPLACE FUNCTION public.can_access_customer_contacts(client_id_param uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM company_clients cc
    JOIN user_company_roles ucr ON cc.company_id = ucr.company_id
    WHERE cc.id = client_id_param
    AND ucr.user_id = auth.uid()
    AND ucr.is_active = true
  );
$$;

-- Drop existing policies that were failing due to missing/broken function
DROP POLICY IF EXISTS "Secure delete customer contacts" ON public.company_client_contacts;
DROP POLICY IF EXISTS "Secure insert customer contacts" ON public.company_client_contacts;
DROP POLICY IF EXISTS "Secure select customer contacts" ON public.company_client_contacts;
DROP POLICY IF EXISTS "Secure update customer contacts" ON public.company_client_contacts;

-- Create optimized and secure RLS policies
CREATE POLICY "company_client_contacts_secure_select"
ON public.company_client_contacts
FOR SELECT
USING (
  (SELECT auth.role()) = 'authenticated' AND
  (SELECT auth.uid()) IS NOT NULL AND
  NOT COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) AND
  client_id IN (
    SELECT cc.id
    FROM company_clients cc
    JOIN user_company_roles ucr ON cc.company_id = ucr.company_id
    WHERE ucr.user_id = (SELECT auth.uid())
    AND ucr.is_active = true
  )
);

CREATE POLICY "company_client_contacts_secure_insert"
ON public.company_client_contacts
FOR INSERT
WITH CHECK (
  (SELECT auth.role()) = 'authenticated' AND
  (SELECT auth.uid()) IS NOT NULL AND
  NOT COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) AND
  client_id IN (
    SELECT cc.id
    FROM company_clients cc
    JOIN user_company_roles ucr ON cc.company_id = ucr.company_id
    WHERE ucr.user_id = (SELECT auth.uid())
    AND ucr.is_active = true
    AND ucr.role IN ('company_owner', 'operations_manager', 'superadmin')
  )
);

CREATE POLICY "company_client_contacts_secure_update"
ON public.company_client_contacts
FOR UPDATE
USING (
  (SELECT auth.role()) = 'authenticated' AND
  (SELECT auth.uid()) IS NOT NULL AND
  NOT COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) AND
  client_id IN (
    SELECT cc.id
    FROM company_clients cc
    JOIN user_company_roles ucr ON cc.company_id = ucr.company_id
    WHERE ucr.user_id = (SELECT auth.uid())
    AND ucr.is_active = true
    AND ucr.role IN ('company_owner', 'operations_manager', 'superadmin')
  )
)
WITH CHECK (
  (SELECT auth.role()) = 'authenticated' AND
  (SELECT auth.uid()) IS NOT NULL AND
  NOT COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) AND
  client_id IN (
    SELECT cc.id
    FROM company_clients cc
    JOIN user_company_roles ucr ON cc.company_id = ucr.company_id
    WHERE ucr.user_id = (SELECT auth.uid())
    AND ucr.is_active = true
    AND ucr.role IN ('company_owner', 'operations_manager', 'superadmin')
  )
);

CREATE POLICY "company_client_contacts_secure_delete"
ON public.company_client_contacts
FOR DELETE
USING (
  (SELECT auth.role()) = 'authenticated' AND
  (SELECT auth.uid()) IS NOT NULL AND
  NOT COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) AND
  client_id IN (
    SELECT cc.id
    FROM company_clients cc
    JOIN user_company_roles ucr ON cc.company_id = ucr.company_id
    WHERE ucr.user_id = (SELECT auth.uid())
    AND ucr.is_active = true
    AND ucr.role IN ('company_owner', 'operations_manager', 'superadmin')
  )
);