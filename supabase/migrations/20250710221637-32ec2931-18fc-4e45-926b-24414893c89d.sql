-- Add new operations_manager role to the enum
ALTER TYPE public.user_role ADD VALUE 'operations_manager';

-- Update existing senior_dispatcher records to operations_manager
UPDATE public.user_company_roles 
SET role = 'operations_manager' 
WHERE role = 'senior_dispatcher';

-- Note: We can't remove the old enum value in the same transaction
-- PostgreSQL doesn't support removing enum values directly
-- The old 'senior_dispatcher' value will remain in the enum but won't be used