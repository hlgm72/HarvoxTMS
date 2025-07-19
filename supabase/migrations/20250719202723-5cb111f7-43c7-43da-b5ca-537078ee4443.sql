-- Rename company_brokers table to company_clients
ALTER TABLE public.company_brokers RENAME TO company_clients;

-- Rename company_broker_dispatchers table to company_client_contacts  
ALTER TABLE public.company_broker_dispatchers RENAME TO company_client_contacts;

-- Update foreign key column name in company_client_contacts table
ALTER TABLE public.company_client_contacts RENAME COLUMN broker_id TO client_id;

-- Update foreign key column name in loads table
ALTER TABLE public.loads RENAME COLUMN broker_id TO client_id;
ALTER TABLE public.loads RENAME COLUMN broker_dispatcher_id TO client_contact_id;

-- Update RLS policies for the renamed tables
DROP POLICY IF EXISTS "Company brokers complete policy" ON public.company_clients;
CREATE POLICY "Company clients complete policy" 
ON public.company_clients 
FOR ALL 
USING (
  auth.role() = 'service_role'::text OR 
  (auth.role() = 'authenticated'::text AND 
   NOT is_superadmin((select auth.uid())) AND 
   company_id IN (
     SELECT company_id FROM get_user_company_roles((select auth.uid()))
   ))
) 
WITH CHECK (
  auth.role() = 'service_role'::text OR 
  (auth.role() = 'authenticated'::text AND 
   company_id IN (
     SELECT company_id FROM get_user_company_roles((select auth.uid()))
   ))
);

DROP POLICY IF EXISTS "Company broker dispatchers complete policy" ON public.company_client_contacts;
CREATE POLICY "Company client contacts complete policy" 
ON public.company_client_contacts 
FOR ALL 
USING (
  auth.role() = 'service_role'::text OR 
  (auth.role() = 'authenticated'::text AND 
   client_id IN (
     SELECT cc.id FROM company_clients cc
     WHERE cc.company_id IN (
       SELECT company_id FROM get_user_company_roles((select auth.uid()))
     )
   ))
) 
WITH CHECK (
  auth.role() = 'service_role'::text OR 
  (auth.role() = 'authenticated'::text AND 
   client_id IN (
     SELECT cc.id FROM company_clients cc
     WHERE cc.company_id IN (
       SELECT company_id FROM get_user_company_roles((select auth.uid()))
     )
   ))
);

-- Add comments to clarify the new table purposes
COMMENT ON TABLE public.company_clients IS 'Clients that provide loads to the company (brokers, shippers, 3PLs, etc.)';
COMMENT ON TABLE public.company_client_contacts IS 'Contact persons at client companies who can be assigned to loads';

-- Update any existing indexes
ALTER INDEX IF EXISTS idx_company_brokers_company_id RENAME TO idx_company_clients_company_id;
ALTER INDEX IF EXISTS idx_company_broker_dispatchers_broker_id RENAME TO idx_company_client_contacts_client_id;