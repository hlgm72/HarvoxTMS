-- STEP 1: Add new columns to existing tables to consolidate data

-- Add termination fields to user_company_roles
ALTER TABLE public.user_company_roles 
ADD COLUMN termination_date date,
ADD COLUMN termination_reason text,
ADD COLUMN hire_date date;

-- Add status tracking to user_company_roles (for dispatchers)
ALTER TABLE public.user_company_roles 
ADD COLUMN employment_status text DEFAULT 'active'::text;

-- STEP 2: Migrate existing data from company_drivers
UPDATE public.user_company_roles 
SET 
  termination_date = cd.termination_date,
  termination_reason = cd.termination_reason,
  is_active = cd.is_active
FROM public.company_drivers cd
WHERE user_company_roles.user_id = cd.user_id 
AND user_company_roles.role = 'driver';

-- STEP 3: Migrate hire_date from company_dispatchers to user_company_roles
UPDATE public.user_company_roles 
SET 
  hire_date = cd.hire_date,
  employment_status = cd.status
FROM public.company_dispatchers cd
WHERE user_company_roles.user_id = cd.user_id 
AND user_company_roles.role = 'dispatcher';

-- STEP 4: Create view for backwards compatibility during transition
CREATE OR REPLACE VIEW public.company_drivers_view AS
SELECT 
  ucr.user_id,
  ucr.termination_date,
  ucr.termination_reason,
  ucr.is_active,
  ucr.created_at,
  ucr.updated_at,
  gen_random_uuid() as id -- For backwards compatibility
FROM public.user_company_roles ucr
WHERE ucr.role = 'driver';

-- STEP 5: Create view for company_dispatchers
CREATE OR REPLACE VIEW public.company_dispatchers_view AS
SELECT 
  ucr.user_id,
  p.first_name,
  p.last_name,
  p.email,
  p.phone,
  ucr.hire_date,
  ucr.employment_status as status,
  ucr.company_id,
  ucr.created_at,
  ucr.updated_at,
  gen_random_uuid() as id -- For backwards compatibility
FROM public.user_company_roles ucr
JOIN public.profiles p ON p.user_id = ucr.user_id
WHERE ucr.role = 'dispatcher';

-- STEP 6: Enable RLS on views (they inherit from base tables)
-- Views automatically inherit RLS from their base tables

-- STEP 7: Drop the redundant tables (will be done in next migration after code update)
-- DROP TABLE public.company_drivers;
-- DROP TABLE public.company_dispatchers;