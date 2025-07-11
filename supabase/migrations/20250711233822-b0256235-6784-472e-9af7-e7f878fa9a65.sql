-- Arreglar recursión infinita en políticas RLS de user_company_roles
-- El problema es que estamos consultando user_company_roles dentro de sus propias políticas

-- Eliminar las políticas problemáticas que causan recursión
DROP POLICY IF EXISTS "User company roles SELECT policy" ON public.user_company_roles;
DROP POLICY IF EXISTS "User company roles INSERT policy" ON public.user_company_roles;
DROP POLICY IF EXISTS "User company roles UPDATE policy" ON public.user_company_roles;
DROP POLICY IF EXISTS "User company roles DELETE policy" ON public.user_company_roles;

-- Crear políticas mejoradas sin recursión usando la función security definer
-- Política para SELECT - evitar recursión usando función
CREATE POLICY "User company roles SELECT policy" 
ON public.user_company_roles 
FOR SELECT 
TO authenticated
USING (
  (SELECT auth.uid()) = user_id 
  OR 
  is_company_owner_in_company(company_id)
  OR
  is_superadmin((SELECT auth.uid()))
);

-- Política para INSERT - evitar recursión
CREATE POLICY "User company roles INSERT policy" 
ON public.user_company_roles 
FOR INSERT 
TO authenticated
WITH CHECK (
  (SELECT auth.uid()) = user_id 
  OR 
  is_company_owner_in_company(company_id)
  OR
  is_superadmin((SELECT auth.uid()))
);

-- Política para UPDATE - evitar recursión
CREATE POLICY "User company roles UPDATE policy" 
ON public.user_company_roles 
FOR UPDATE 
TO authenticated
USING (
  (SELECT auth.uid()) = user_id 
  OR 
  is_company_owner_in_company(company_id)
  OR
  is_superadmin((SELECT auth.uid()))
)
WITH CHECK (
  (SELECT auth.uid()) = user_id 
  OR 
  is_company_owner_in_company(company_id)
  OR
  is_superadmin((SELECT auth.uid()))
);

-- Política para DELETE - solo company owners y superadmin
CREATE POLICY "User company roles DELETE policy" 
ON public.user_company_roles 
FOR DELETE 
TO authenticated
USING (
  is_company_owner_in_company(company_id)
  OR
  is_superadmin((SELECT auth.uid()))
);