-- Remove benefits information fields from company_drivers table
ALTER TABLE public.company_drivers 
DROP COLUMN IF EXISTS benefits_eligible,
DROP COLUMN IF EXISTS vacation_days_accrued,
DROP COLUMN IF EXISTS sick_days_accrued;