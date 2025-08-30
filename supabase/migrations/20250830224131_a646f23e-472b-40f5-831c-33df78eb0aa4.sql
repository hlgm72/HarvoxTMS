-- Optimizar políticas RLS para mejor rendimiento
-- Tabla: recurring_expense_exclusions

-- Actualizar política exclusions_permanent_users_only
DROP POLICY IF EXISTS "exclusions_permanent_users_only" ON public.recurring_expense_exclusions;
CREATE POLICY "exclusions_permanent_users_only" ON public.recurring_expense_exclusions
FOR ALL USING (
  ((SELECT auth.uid()) IS NOT NULL) AND 
  (NOT COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous'::text)::boolean, false)) AND
  (user_id = (SELECT auth.uid()) OR 
   EXISTS (
     SELECT 1 FROM user_company_roles ucr1
     JOIN user_company_roles ucr2 ON ucr1.company_id = ucr2.company_id
     WHERE ucr1.user_id = recurring_expense_exclusions.user_id
       AND ucr1.is_active = true
       AND ucr2.user_id = (SELECT auth.uid())
       AND ucr2.is_active = true
       AND ucr2.role = ANY(ARRAY['company_owner'::user_role, 'operations_manager'::user_role, 'superadmin'::user_role])
   ))
)
WITH CHECK (
  ((SELECT auth.uid()) IS NOT NULL) AND 
  (NOT COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous'::text)::boolean, false)) AND
  (user_id = (SELECT auth.uid()) OR 
   EXISTS (
     SELECT 1 FROM user_company_roles ucr1
     JOIN user_company_roles ucr2 ON ucr1.company_id = ucr2.company_id
     WHERE ucr1.user_id = recurring_expense_exclusions.user_id
       AND ucr1.is_active = true
       AND ucr2.user_id = (SELECT auth.uid())
       AND ucr2.is_active = true
       AND ucr2.role = ANY(ARRAY['company_owner'::user_role, 'operations_manager'::user_role, 'superadmin'::user_role])
   ))
);

-- Actualizar política exclusions_authorized_access
DROP POLICY IF EXISTS "exclusions_authorized_access" ON public.recurring_expense_exclusions;
CREATE POLICY "exclusions_authorized_access" ON public.recurring_expense_exclusions
FOR ALL USING (
  ((SELECT auth.uid()) IS NOT NULL) AND 
  (NOT COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous'::text)::boolean, false)) AND
  (user_id = (SELECT auth.uid()) OR 
   EXISTS (
     SELECT 1 FROM user_company_roles ucr1
     JOIN user_company_roles ucr2 ON ucr1.company_id = ucr2.company_id
     WHERE ucr1.user_id = recurring_expense_exclusions.user_id
       AND ucr1.is_active = true
       AND ucr2.user_id = (SELECT auth.uid())
       AND ucr2.is_active = true
       AND ucr2.role = ANY(ARRAY['company_owner'::user_role, 'operations_manager'::user_role, 'superadmin'::user_role])
   ))
)
WITH CHECK (
  ((SELECT auth.uid()) IS NOT NULL) AND 
  (NOT COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous'::text)::boolean, false)) AND
  (user_id = (SELECT auth.uid()) OR 
   EXISTS (
     SELECT 1 FROM user_company_roles ucr1
     JOIN user_company_roles ucr2 ON ucr1.company_id = ucr2.company_id
     WHERE ucr1.user_id = recurring_expense_exclusions.user_id
       AND ucr1.is_active = true
       AND ucr2.user_id = (SELECT auth.uid())
       AND ucr2.is_active = true
       AND ucr2.role = ANY(ARRAY['company_owner'::user_role, 'operations_manager'::user_role, 'superadmin'::user_role])
   ))
);

-- Tabla: owner_operators

-- Actualizar política owner_operators_enhanced_update
DROP POLICY IF EXISTS "owner_operators_enhanced_update" ON public.owner_operators;
CREATE POLICY "owner_operators_enhanced_update" ON public.owner_operators
FOR UPDATE USING (
  ((SELECT auth.uid()) IS NOT NULL) AND 
  (NOT COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous'::text)::boolean, false)) AND
  (user_id = (SELECT auth.uid()) OR 
   EXISTS (
     SELECT 1 FROM user_company_roles ucr1
     JOIN user_company_roles ucr2 ON ucr1.company_id = ucr2.company_id
     WHERE ucr1.user_id = owner_operators.user_id
       AND ucr1.is_active = true
       AND ucr2.user_id = (SELECT auth.uid())
       AND ucr2.is_active = true
       AND ucr2.role = ANY(ARRAY['company_owner'::user_role, 'operations_manager'::user_role, 'superadmin'::user_role])
   ))
)
WITH CHECK (
  ((SELECT auth.uid()) IS NOT NULL) AND 
  (NOT COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous'::text)::boolean, false)) AND
  (user_id = (SELECT auth.uid()) OR 
   EXISTS (
     SELECT 1 FROM user_company_roles ucr1
     JOIN user_company_roles ucr2 ON ucr1.company_id = ucr2.company_id
     WHERE ucr1.user_id = owner_operators.user_id
       AND ucr1.is_active = true
       AND ucr2.user_id = (SELECT auth.uid())
       AND ucr2.is_active = true
       AND ucr2.role = ANY(ARRAY['company_owner'::user_role, 'operations_manager'::user_role, 'superadmin'::user_role])
   ))
);

-- Actualizar política owner_operators_enhanced_insert
DROP POLICY IF EXISTS "owner_operators_enhanced_insert" ON public.owner_operators;
CREATE POLICY "owner_operators_enhanced_insert" ON public.owner_operators
FOR INSERT WITH CHECK (
  ((SELECT auth.uid()) IS NOT NULL) AND 
  (NOT COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous'::text)::boolean, false)) AND
  (user_id = (SELECT auth.uid()) OR 
   EXISTS (
     SELECT 1 FROM user_company_roles ucr1
     JOIN user_company_roles ucr2 ON ucr1.company_id = ucr2.company_id
     WHERE ucr1.user_id = owner_operators.user_id
       AND ucr1.is_active = true
       AND ucr2.user_id = (SELECT auth.uid())
       AND ucr2.is_active = true
       AND ucr2.role = ANY(ARRAY['company_owner'::user_role, 'operations_manager'::user_role, 'superadmin'::user_role])
   ))
);