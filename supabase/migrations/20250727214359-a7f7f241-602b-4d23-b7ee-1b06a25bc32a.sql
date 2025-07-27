-- Fix the profiles table structure and create the missing profile correctly
-- First, let's check the actual structure and fix the profile creation

-- Insert the missing profile with the correct column structure
INSERT INTO public.profiles (id, user_id, first_name, last_name)
SELECT '087a825c-94ea-42d9-8388-5087a19d776f', '087a825c-94ea-42d9-8388-5087a19d776f', 'Hector Gonzalez', 'hlgm72@gmail.com'
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles WHERE id = '087a825c-94ea-42d9-8388-5087a19d776f'
);

-- Update the select policy to use user_id instead of id for comparison
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;

CREATE POLICY "profiles_select_policy" 
ON public.profiles 
FOR SELECT 
USING (
  ((SELECT auth.role()) = 'service_role') OR
  (auth.uid() IS NOT NULL AND 
   (auth.jwt()->>'is_anonymous')::boolean IS FALSE AND
   auth.uid() = user_id)
);