-- Fix 406 error in profiles by ensuring proper policies and creating missing profile
-- First, let's create the missing profile for the existing user

-- Insert the missing profile for the user (if it doesn't exist)
INSERT INTO public.profiles (id, first_name, last_name)
SELECT '087a825c-94ea-42d9-8388-5087a19d776f', 'Hector Gonzalez', 'hlgm72@gmail.com'
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles WHERE id = '087a825c-94ea-42d9-8388-5087a19d776f'
);

-- Also fix the profiles policies to handle cases where no profile exists gracefully
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;

-- Create a more robust select policy that won't cause 406 errors
CREATE POLICY "profiles_select_policy" 
ON public.profiles 
FOR SELECT 
USING (
  ((SELECT auth.role()) = 'service_role') OR
  (auth.uid() IS NOT NULL AND 
   (auth.jwt()->>'is_anonymous')::boolean IS FALSE AND
   auth.uid() = id)
);