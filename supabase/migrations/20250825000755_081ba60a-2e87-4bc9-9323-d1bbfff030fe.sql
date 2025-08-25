-- Fix multiple permissive policies warning on company_client_contacts table
-- Remove redundant old policies that conflict with the comprehensive policy

-- Drop all the old individual policies that are causing conflicts
DROP POLICY IF EXISTS "client_contacts_authenticated_admin_only_delete" ON public.company_client_contacts;
DROP POLICY IF EXISTS "client_contacts_authenticated_admin_only_insert" ON public.company_client_contacts;
DROP POLICY IF EXISTS "client_contacts_authenticated_admin_only_update" ON public.company_client_contacts;
DROP POLICY IF EXISTS "client_contacts_authenticated_company_only_select" ON public.company_client_contacts;

-- The comprehensive policy "contacts_authenticated_company_access" already handles all operations
-- and provides the correct security model, so no need to recreate anything