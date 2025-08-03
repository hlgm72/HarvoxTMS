-- STEP 1: Add new columns to existing tables to consolidate data

-- Add termination fields to user_company_roles
ALTER TABLE public.user_company_roles 
ADD COLUMN IF NOT EXISTS termination_date date,
ADD COLUMN IF NOT EXISTS termination_reason text,
ADD COLUMN IF NOT EXISTS hire_date date,
ADD COLUMN IF NOT EXISTS employment_status text DEFAULT 'active'::text;

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

-- STEP 5: Create view for company_dispatchers (fix: get email from company_dispatchers)
CREATE OR REPLACE VIEW public.company_dispatchers_view AS
SELECT 
  ucr.user_id,
  COALESCE(p.first_name, cd.first_name) as first_name,
  COALESCE(p.last_name, cd.last_name) as last_name,
  cd.email, -- Get email from company_dispatchers since profiles doesn't have it
  COALESCE(p.phone, cd.phone) as phone,
  ucr.hire_date,
  ucr.employment_status as status,
  ucr.company_id,
  ucr.created_at,
  ucr.updated_at,
  gen_random_uuid() as id -- For backwards compatibility
FROM public.user_company_roles ucr
LEFT JOIN public.profiles p ON p.user_id = ucr.user_id
LEFT JOIN public.company_dispatchers cd ON cd.user_id = ucr.user_id
WHERE ucr.role = 'dispatcher';