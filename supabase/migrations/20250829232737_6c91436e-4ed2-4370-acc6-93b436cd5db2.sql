-- Arreglar políticas RLS de owner_operators para permitir que administradores gestionen conductores

-- Política UPDATE mejorada para owner_operators
DROP POLICY IF EXISTS "owner_operators_final_update" ON public.owner_operators;

CREATE POLICY "owner_operators_enhanced_update" 
ON public.owner_operators 
FOR UPDATE
USING (
  -- Usuario autenticado
  auth.role() = 'authenticated' AND 
  auth.uid() IS NOT NULL AND 
  NOT COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) AND
  (
    -- El usuario puede editar su propio registro
    user_id = auth.uid() OR
    -- O si es administrador de la empresa donde está el conductor
    user_id IN (
      SELECT ucr1.user_id
      FROM user_company_roles ucr1
      JOIN user_company_roles ucr2 ON ucr1.company_id = ucr2.company_id
      WHERE ucr2.user_id = auth.uid() 
        AND ucr1.is_active = true 
        AND ucr2.is_active = true 
        AND ucr2.role IN ('company_owner', 'operations_manager', 'superadmin')
    )
  )
)
WITH CHECK (
  -- Usuario autenticado
  auth.role() = 'authenticated' AND 
  auth.uid() IS NOT NULL AND 
  NOT COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) AND
  (
    -- El usuario puede editar su propio registro
    user_id = auth.uid() OR
    -- O si es administrador de la empresa donde está el conductor
    user_id IN (
      SELECT ucr1.user_id
      FROM user_company_roles ucr1
      JOIN user_company_roles ucr2 ON ucr1.company_id = ucr2.company_id
      WHERE ucr2.user_id = auth.uid() 
        AND ucr1.is_active = true 
        AND ucr2.is_active = true 
        AND ucr2.role IN ('company_owner', 'operations_manager', 'superadmin')
    )
  )
);

-- Política INSERT mejorada para owner_operators
DROP POLICY IF EXISTS "owner_operators_final_insert" ON public.owner_operators;

CREATE POLICY "owner_operators_enhanced_insert" 
ON public.owner_operators 
FOR INSERT
WITH CHECK (
  -- Usuario autenticado
  auth.role() = 'authenticated' AND 
  auth.uid() IS NOT NULL AND 
  NOT COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) AND
  (
    -- El usuario puede crear su propio registro
    user_id = auth.uid() OR
    -- O si es administrador de la empresa donde está el conductor
    user_id IN (
      SELECT ucr1.user_id
      FROM user_company_roles ucr1
      JOIN user_company_roles ucr2 ON ucr1.company_id = ucr2.company_id
      WHERE ucr2.user_id = auth.uid() 
        AND ucr1.is_active = true 
        AND ucr2.is_active = true 
        AND ucr2.role IN ('company_owner', 'operations_manager', 'superadmin')
    )
  )
);