-- Optimizar la política de driver_profiles para mejorar rendimiento
DROP POLICY IF EXISTS "Driver profiles company access" ON public.driver_profiles;

-- Crear política optimizada que evalúa auth functions una sola vez por query
CREATE POLICY "Driver profiles company access" 
ON public.driver_profiles 
FOR ALL 
USING (
  (SELECT auth.uid()) IS NOT NULL 
  AND ((SELECT auth.jwt())->>'is_anonymous')::boolean IS FALSE
  AND (
    -- El usuario puede ver su propio perfil
    (SELECT auth.uid()) = user_id 
    OR
    -- O puede ver perfiles de usuarios de su misma compañía
    user_id IN (
      SELECT ucr1.user_id 
      FROM user_company_roles ucr1
      WHERE ucr1.company_id IN (
        SELECT ucr2.company_id 
        FROM user_company_roles ucr2 
        WHERE ucr2.user_id = (SELECT auth.uid())
        AND ucr2.is_active = true
      )
      AND ucr1.is_active = true
    )
  )
)
WITH CHECK (
  (SELECT auth.uid()) IS NOT NULL 
  AND ((SELECT auth.jwt())->>'is_anonymous')::boolean IS FALSE
  AND (SELECT auth.uid()) = user_id
);