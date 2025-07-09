-- Step 2: Update existing senior_dispatcher roles to general_manager
UPDATE public.user_company_roles 
SET role = 'general_manager' 
WHERE role = 'senior_dispatcher';