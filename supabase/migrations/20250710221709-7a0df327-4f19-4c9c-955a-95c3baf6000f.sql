-- Update existing senior_dispatcher records to operations_manager
UPDATE public.user_company_roles 
SET role = 'operations_manager' 
WHERE role = 'senior_dispatcher';