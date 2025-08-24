-- Fix critical security issue: RLS policies referencing non-existent/broken function
-- This causes policies to fail and allows public access to sensitive customer contact information

-- Step 1: Drop existing policies first (they depend on the broken function)
DROP POLICY IF EXISTS "Secure delete customer contacts" ON public.company_client_contacts;
DROP POLICY IF EXISTS "Secure insert customer contacts" ON public.company_client_contacts;
DROP POLICY IF EXISTS "Secure select customer contacts" ON public.company_client_contacts;
DROP POLICY IF EXISTS "Secure update customer contacts" ON public.company_client_contacts;

-- Step 2: Drop the broken function
DROP FUNCTION IF EXISTS public.can_access_customer_contacts(uuid);

-- Step 3: Create the correct security function 
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

-- Step 4: Create optimized and secure RLS policies that properly protect customer data
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