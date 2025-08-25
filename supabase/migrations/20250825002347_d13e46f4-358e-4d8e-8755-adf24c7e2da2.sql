-- Function to sync existing users' metadata to profiles table
-- This will help fix users who registered before the trigger was created

CREATE OR REPLACE FUNCTION public.sync_existing_user_profiles()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  user_record RECORD;
  updated_count INTEGER := 0;
BEGIN
  -- Loop through all auth users who don't have complete profile data
  FOR user_record IN 
    SELECT 
      au.id,
      au.raw_user_meta_data,
      p.first_name,
      p.last_name
    FROM auth.users au
    LEFT JOIN public.profiles p ON au.id = p.user_id
    WHERE (
      p.user_id IS NULL OR 
      (p.first_name IS NULL AND au.raw_user_meta_data ->> 'first_name' IS NOT NULL) OR
      (p.first_name IS NULL AND au.raw_user_meta_data ->> 'name' IS NOT NULL) OR
      (p.last_name IS NULL AND au.raw_user_meta_data ->> 'last_name' IS NOT NULL)
    )
  LOOP
    -- Update or insert profile data
    INSERT INTO public.profiles (
      user_id,
      first_name,
      last_name
    ) VALUES (
      user_record.id,
      COALESCE(
        user_record.first_name,
        user_record.raw_user_meta_data ->> 'first_name',
        user_record.raw_user_meta_data ->> 'name'
      ),
      COALESCE(
        user_record.last_name,
        user_record.raw_user_meta_data ->> 'last_name'
      )
    )
    ON CONFLICT (user_id) DO UPDATE SET
      first_name = COALESCE(
        EXCLUDED.first_name,
        profiles.first_name
      ),
      last_name = COALESCE(
        EXCLUDED.last_name,
        profiles.last_name
      ),
      updated_at = now()
    WHERE 
      profiles.first_name IS NULL OR 
      profiles.last_name IS NULL;
    
    updated_count := updated_count + 1;
  END LOOP;
  
  RAISE NOTICE 'Synced profiles for % users', updated_count;
END;
$$;

-- Execute the function to sync existing users
SELECT public.sync_existing_user_profiles();