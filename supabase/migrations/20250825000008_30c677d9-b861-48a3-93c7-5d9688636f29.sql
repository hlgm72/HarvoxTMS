-- Fix critical security issue: RLS policies referencing non-existent/broken function
-- This causes policies to fail and allows public access to sensitive customer contact information

-- Step 1: Drop ALL existing policies (including any new ones that might exist)
DROP POLICY IF EXISTS "company_client_contacts_secure_select" ON public.company_client_contacts;
DROP POLICY IF EXISTS "company_client_contacts_secure_insert" ON public.company_client_contacts;
DROP POLICY IF EXISTS "company_client_contacts_secure_update" ON public.company_client_contacts;
DROP POLICY IF EXISTS "company_client_contacts_secure_delete" ON public.company_client_contacts;
DROP POLICY IF EXISTS "Secure delete customer contacts" ON public.company_client_contacts;
DROP POLICY IF EXISTS "Secure insert customer contacts" ON public.company_client_contacts;
DROP POLICY IF EXISTS "Secure select customer contacts" ON public.company_client_contacts;
DROP POLICY IF EXISTS "Secure update customer contacts" ON public.company_client_contacts;

-- Step 2: Drop the broken function
DROP FUNCTION IF EXISTS public.can_access_customer_contacts;

-- Step 3: Create optimized RLS policies that properly protect customer data
-- These policies ensure only authenticated company users can access their own client contacts
CREATE POLICY "contacts_authenticated_company_access"
ON public.company_client_contacts
FOR ALL
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