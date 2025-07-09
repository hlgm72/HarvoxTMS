-- Remove email fields from profiles and driver_profiles tables
-- We'll use auth.users.email instead to avoid duplication

-- Remove email column from profiles table
ALTER TABLE public.profiles DROP COLUMN IF EXISTS email;

-- Remove email column from driver_profiles table  
ALTER TABLE public.driver_profiles DROP COLUMN IF EXISTS email;