-- Remove employment, compensation, and performance tracking fields from company_drivers table
ALTER TABLE public.company_drivers 
DROP COLUMN IF EXISTS employee_id,
DROP COLUMN IF EXISTS hire_date,
DROP COLUMN IF EXISTS employment_type,
DROP COLUMN IF EXISTS job_title,
DROP COLUMN IF EXISTS department,
DROP COLUMN IF EXISTS base_salary,
DROP COLUMN IF EXISTS hourly_rate,
DROP COLUMN IF EXISTS pay_frequency,
DROP COLUMN IF EXISTS performance_rating,
DROP COLUMN IF EXISTS last_review_date,
DROP COLUMN IF EXISTS next_review_date;