-- Add license issue date field to driver_profiles table
ALTER TABLE public.driver_profiles 
ADD COLUMN license_issue_date date;

-- Add comment to clarify the field purpose
COMMENT ON COLUMN public.driver_profiles.license_issue_date IS 'Date when the driver first obtained their CDL license (used to calculate driving experience)';