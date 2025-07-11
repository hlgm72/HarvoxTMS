-- Arreglar problemas de rendimiento en políticas RLS de user_company_roles

-- Primero eliminar las políticas existentes que causan problemas
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_company_roles;
DROP POLICY IF EXISTS "Users can insert their own roles" ON public.user_company_roles;
DROP POLICY IF EXISTS "Users can update their own roles" ON public.user_company_roles;
DROP POLICY IF EXISTS "Company owners can manage roles in their company" ON public.user_company_roles;

-- Crear políticas optimizadas y consolidadas
-- Política unificada para SELECT
CREATE POLICY "User company roles SELECT policy" 
ON public.user_company_roles 
FOR SELECT 
TO authenticated
USING (
  (SELECT auth.uid()) = user_id 
  OR 
  EXISTS (
    SELECT 1 FROM public.user_company_roles ucr_owner
    WHERE ucr_owner.user_id = (SELECT auth.uid())
    AND ucr_owner.company_id = user_company_roles.company_id
    AND ucr_owner.role = 'company_owner'
    AND ucr_owner.is_active = true
  )
  OR
  is_superadmin((SELECT auth.uid()))
);

-- Política unificada para INSERT
CREATE POLICY "User company roles INSERT policy" 
ON public.user_company_roles 
FOR INSERT 
TO authenticated
WITH CHECK (
  (SELECT auth.uid()) = user_id 
  OR 
  EXISTS (
    SELECT 1 FROM public.user_company_roles ucr_owner
    WHERE ucr_owner.user_id = (SELECT auth.uid())
    AND ucr_owner.company_id = user_company_roles.company_id
    AND ucr_owner.role = 'company_owner'
    AND ucr_owner.is_active = true
  )
  OR
  is_superadmin((SELECT auth.uid()))
);

-- Política unificada para UPDATE
CREATE POLICY "User company roles UPDATE policy" 
ON public.user_company_roles 
FOR UPDATE 
TO authenticated
USING (
  (SELECT auth.uid()) = user_id 
  OR 
  EXISTS (
    SELECT 1 FROM public.user_company_roles ucr_owner
    WHERE ucr_owner.user_id = (SELECT auth.uid())
    AND ucr_owner.company_id = user_company_roles.company_id
    AND ucr_owner.role = 'company_owner'
    AND ucr_owner.is_active = true
  )
  OR
  is_superadmin((SELECT auth.uid()))
)
WITH CHECK (
  (SELECT auth.uid()) = user_id 
  OR 
  EXISTS (
    SELECT 1 FROM public.user_company_roles ucr_owner
    WHERE ucr_owner.user_id = (SELECT auth.uid())
    AND ucr_owner.company_id = user_company_roles.company_id
    AND ucr_owner.role = 'company_owner'
    AND ucr_owner.is_active = true
  )
  OR
  is_superadmin((SELECT auth.uid()))
);

-- Política para DELETE (mantener funcionalidad existente)
CREATE POLICY "User company roles DELETE policy" 
ON public.user_company_roles 
FOR DELETE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_company_roles ucr_owner
    WHERE ucr_owner.user_id = (SELECT auth.uid())
    AND ucr_owner.company_id = user_company_roles.company_id
    AND ucr_owner.role = 'company_owner'
    AND ucr_owner.is_active = true
  )
  OR
  is_superadmin((SELECT auth.uid()))
);