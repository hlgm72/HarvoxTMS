-- Agregar política temporal más permisiva para driver_profiles
DROP POLICY IF EXISTS "Driver profiles complete policy" ON public.driver_profiles;

-- Crear política más simple que permita acceso a usuarios autenticados de la misma compañía
CREATE POLICY "Driver profiles company access" 
ON public.driver_profiles 
FOR ALL 
USING (
  auth.uid() IS NOT NULL 
  AND (
    -- El usuario puede ver su propio perfil
    auth.uid() = user_id 
    OR
    -- O puede ver perfiles de usuarios de su misma compañía
    user_id IN (
      SELECT ucr1.user_id 
      FROM user_company_roles ucr1
      WHERE ucr1.company_id IN (
        SELECT ucr2.company_id 
        FROM user_company_roles ucr2 
        WHERE ucr2.user_id = auth.uid() 
        AND ucr2.is_active = true
      )
      AND ucr1.is_active = true
    )
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND auth.uid() = user_id
);