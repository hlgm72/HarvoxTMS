-- Corregir completamente las políticas de profiles para eliminar acceso anónimo

-- Eliminar todas las políticas existentes de profiles
DROP POLICY IF EXISTS "Company users can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can delete their own profile" ON public.profiles;

-- Crear política SELECT restringida solo a usuarios autenticados
CREATE POLICY "Authenticated users can view company profiles"
ON public.profiles
FOR SELECT
TO authenticated
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

-- Política INSERT solo para usuarios autenticados
CREATE POLICY "Authenticated users can insert their own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (
  (SELECT auth.uid()) IS NOT NULL AND 
  COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false AND
  user_id = (SELECT auth.uid())
);

-- Política UPDATE solo para usuarios autenticados
CREATE POLICY "Authenticated users can update their own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  (SELECT auth.uid()) IS NOT NULL AND 
  COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false AND
  user_id = (SELECT auth.uid())
)
WITH CHECK (
  (SELECT auth.uid()) IS NOT NULL AND 
  COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false AND
  user_id = (SELECT auth.uid())
);

-- Política DELETE solo para usuarios autenticados
CREATE POLICY "Authenticated users can delete their own profile"
ON public.profiles
FOR DELETE
TO authenticated
USING (
  (SELECT auth.uid()) IS NOT NULL AND 
  COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false AND
  user_id = (SELECT auth.uid())
);