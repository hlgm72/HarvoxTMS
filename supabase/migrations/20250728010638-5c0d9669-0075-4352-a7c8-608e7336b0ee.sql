-- Arreglar la política de driver_profiles para excluir usuarios anónimos
DROP POLICY IF EXISTS "Driver profiles company access" ON public.driver_profiles;

-- Crear política que excluya explícitamente usuarios anónimos
CREATE POLICY "Driver profiles company access" 
ON public.driver_profiles 
FOR ALL 
USING (
  auth.uid() IS NOT NULL 
  AND (auth.jwt()->>'is_anonymous')::boolean IS FALSE
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
  AND (auth.jwt()->>'is_anonymous')::boolean IS FALSE
  AND auth.uid() = user_id
);