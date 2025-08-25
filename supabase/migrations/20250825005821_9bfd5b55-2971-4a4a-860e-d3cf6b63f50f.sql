-- Crear registro en profiles para usuarios que no lo tienen pero tienen driver_profiles
-- usando los datos de raw_user_meta_data

INSERT INTO profiles (
  id,
  first_name,
  last_name,
  avatar_url,
  phone,
  created_at,
  updated_at
)
SELECT 
  au.id,
  COALESCE(
    SPLIT_PART(au.raw_user_meta_data->>'full_name', ' ', 1),
    SPLIT_PART(au.raw_user_meta_data->>'name', ' ', 1),
    'Nombre'
  ) as first_name,
  COALESCE(
    CASE 
      WHEN ARRAY_LENGTH(STRING_TO_ARRAY(COALESCE(au.raw_user_meta_data->>'full_name', au.raw_user_meta_data->>'name'), ' '), 1) > 1 
      THEN SUBSTRING(COALESCE(au.raw_user_meta_data->>'full_name', au.raw_user_meta_data->>'name') FROM POSITION(' ' IN COALESCE(au.raw_user_meta_data->>'full_name', au.raw_user_meta_data->>'name')) + 1)
      ELSE 'Apellido'
    END
  ) as last_name,
  COALESCE(au.raw_user_meta_data->>'avatar_url', au.raw_user_meta_data->>'picture') as avatar_url,
  au.phone as phone,
  now() as created_at,
  now() as updated_at
FROM auth.users au
INNER JOIN driver_profiles dp ON au.id = dp.user_id
LEFT JOIN profiles p ON au.id = p.id
WHERE p.id IS NULL -- Solo usuarios que no tienen perfil
  AND dp.is_active = true; -- Solo drivers activos