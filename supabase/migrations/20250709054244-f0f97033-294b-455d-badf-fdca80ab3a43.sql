-- Add SaaS management fields to companies table

-- Add owner/contact fields
ALTER TABLE public.companies 
ADD COLUMN owner_name TEXT,
ADD COLUMN owner_email TEXT,
ADD COLUMN owner_phone TEXT,
ADD COLUMN owner_title TEXT;

-- Add SaaS plan fields
ALTER TABLE public.companies 
ADD COLUMN plan_type TEXT DEFAULT 'basic',
ADD COLUMN max_vehicles INTEGER DEFAULT 10,
ADD COLUMN max_users INTEGER DEFAULT 5,
ADD COLUMN status TEXT DEFAULT 'active',
ADD COLUMN contract_start_date DATE DEFAULT CURRENT_DATE;

-- Create indexes for better performance
CREATE INDEX idx_companies_status ON public.companies(status);
CREATE INDEX idx_companies_plan_type ON public.companies(plan_type);
CREATE INDEX idx_companies_owner_email ON public.companies(owner_email);

-- Add comments for documentation
COMMENT ON COLUMN public.companies.owner_name IS 'Full name of the company owner/primary contact';
COMMENT ON COLUMN public.companies.owner_email IS 'Email of the company owner/primary contact';
COMMENT ON COLUMN public.companies.owner_phone IS 'Phone number of the company owner/primary contact';
COMMENT ON COLUMN public.companies.owner_title IS 'Job title of the company owner/primary contact';
COMMENT ON COLUMN public.companies.plan_type IS 'SaaS plan type (basic, professional, enterprise)';
COMMENT ON COLUMN public.companies.max_vehicles IS 'Maximum number of vehicles allowed for this company';
COMMENT ON COLUMN public.companies.max_users IS 'Maximum number of users allowed for this company';
COMMENT ON COLUMN public.companies.status IS 'Company status (active, suspended, trial, cancelled)';
COMMENT ON COLUMN public.companies.contract_start_date IS 'Date when the contract started';