-- Add foreign key constraint between user_company_roles and profiles
-- This will allow PostgREST to automatically join these tables
ALTER TABLE public.user_company_roles 
ADD CONSTRAINT fk_user_company_roles_user_id 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Note: We can't directly reference auth.users from profiles in PostgREST joins
-- but this constraint will help with data integrity

-- Add index for better performance on joins
CREATE INDEX IF NOT EXISTS idx_user_company_roles_user_id 
ON public.user_company_roles(user_id);

CREATE INDEX IF NOT EXISTS idx_profiles_user_id 
ON public.profiles(user_id);