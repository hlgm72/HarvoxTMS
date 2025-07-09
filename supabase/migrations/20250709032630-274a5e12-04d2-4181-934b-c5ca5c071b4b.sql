-- Add 'general_manager' to the user_role enum and update existing senior_dispatcher roles
ALTER TYPE public.user_role ADD VALUE 'general_manager';

-- Update any existing senior_dispatcher roles to general_manager
UPDATE public.user_company_roles 
SET role = 'general_manager' 
WHERE role = 'senior_dispatcher';