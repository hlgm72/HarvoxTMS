-- Optimizar las políticas RLS de la tabla profiles para mejor visualización de datos de empresa

-- Eliminar política existente y crear una nueva más clara
DROP POLICY IF EXISTS "Driver profiles company access" ON public.profiles;

-- Crear política optimizada para acceso a perfiles
CREATE POLICY "Company users can view profiles"
ON public.profiles
FOR SELECT
USING (
  (SELECT auth.uid()) IS NOT NULL AND 
  COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false AND
  (
    -- El usuario puede ver su propio perfil
    user_id = (SELECT auth.uid()) OR
    -- O puede ver perfiles de usuarios en su misma empresa
    user_id IN (
      SELECT ucr1.user_id
      FROM user_company_roles ucr1
      WHERE ucr1.company_id IN (
        SELECT ucr2.company_id
        FROM user_company_roles ucr2
        WHERE ucr2.user_id = (SELECT auth.uid()) AND ucr2.is_active = true
      ) AND ucr1.is_active = true
    )
  )
);

-- Política para INSERT/UPDATE - solo el propio usuario puede modificar su perfil
CREATE POLICY "Users can manage their own profile"
ON public.profiles
FOR ALL
USING (user_id = (SELECT auth.uid()))
WITH CHECK (user_id = (SELECT auth.uid()));