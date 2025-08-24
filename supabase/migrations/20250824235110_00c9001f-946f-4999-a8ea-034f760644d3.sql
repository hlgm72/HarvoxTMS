-- Complete the optimization by adding optimized policies for owner_operators

-- =======================
-- 4. Create optimized policies for owner_operators (using SELECT for auth functions)
-- =======================
CREATE POLICY "owner_operators_optimized_select" 
ON public.owner_operators 
FOR SELECT 
USING (
  (SELECT auth.role()) = 'authenticated' AND
  (SELECT auth.uid()) IS NOT NULL AND
  NOT COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) AND
  (
    -- Users can see their own owner operator record
    user_id = (SELECT auth.uid()) OR
    -- Company admins can see owner operators in their company
    user_id IN (
      SELECT ucr1.user_id
      FROM user_company_roles ucr1
      JOIN user_company_roles ucr2 ON ucr1.company_id = ucr2.company_id
      WHERE ucr2.user_id = (SELECT auth.uid())
      AND ucr1.is_active = true
      AND ucr2.is_active = true
      AND ucr2.role IN ('company_owner', 'operations_manager', 'superadmin')
    )
  )
);

CREATE POLICY "owner_operators_optimized_insert" 
ON public.owner_operators 
FOR INSERT 
WITH CHECK (
  (SELECT auth.role()) = 'authenticated' AND
  (SELECT auth.uid()) IS NOT NULL AND
  NOT COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) AND
  user_id = (SELECT auth.uid())
);

CREATE POLICY "owner_operators_optimized_update" 
ON public.owner_operators 
FOR UPDATE 
USING (
  (SELECT auth.role()) = 'authenticated' AND
  (SELECT auth.uid()) IS NOT NULL AND
  NOT COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) AND
  user_id = (SELECT auth.uid())
)
WITH CHECK (
  (SELECT auth.role()) = 'authenticated' AND
  (SELECT auth.uid()) IS NOT NULL AND
  NOT COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) AND
  user_id = (SELECT auth.uid())
);

CREATE POLICY "owner_operators_optimized_delete" 
ON public.owner_operators 
FOR DELETE 
USING (
  (SELECT auth.role()) = 'authenticated' AND
  (SELECT auth.uid()) IS NOT NULL AND
  NOT COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) AND
  user_id = (SELECT auth.uid())
);