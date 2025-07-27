-- Fix auth RLS performance warnings by optimizing auth.uid() calls
-- Replace auth.uid() with (SELECT auth.uid()) in user_company_roles policies

-- Drop existing consolidated policies for user_company_roles
DROP POLICY IF EXISTS "Consolidated user_company_roles delete policy" ON public.user_company_roles;
DROP POLICY IF EXISTS "Consolidated user_company_roles insert policy" ON public.user_company_roles;
DROP POLICY IF EXISTS "Consolidated user_company_roles select policy" ON public.user_company_roles;
DROP POLICY IF EXISTS "Consolidated user_company_roles update policy" ON public.user_company_roles;

-- Create optimized consolidated policies with (SELECT auth.uid()) for performance
CREATE POLICY "Consolidated user_company_roles select policy" 
ON public.user_company_roles 
FOR SELECT 
USING (
  require_authenticated_user() AND 
  (
    (SELECT auth.uid()) = user_id OR 
    company_id IN (SELECT get_user_admin_companies((SELECT auth.uid()))) OR 
    is_superadmin((SELECT auth.uid()))
  )
);

CREATE POLICY "Consolidated user_company_roles insert policy" 
ON public.user_company_roles 
FOR INSERT 
WITH CHECK (
  require_authenticated_user() AND 
  (
    user_is_admin_in_company((SELECT auth.uid()), company_id) OR 
    is_superadmin((SELECT auth.uid()))
  )
);

CREATE POLICY "Consolidated user_company_roles update policy" 
ON public.user_company_roles 
FOR UPDATE 
USING (
  require_authenticated_user() AND 
  (
    user_is_admin_in_company((SELECT auth.uid()), company_id) OR 
    is_superadmin((SELECT auth.uid()))
  )
)
WITH CHECK (
  require_authenticated_user() AND 
  (
    user_is_admin_in_company((SELECT auth.uid()), company_id) OR 
    is_superadmin((SELECT auth.uid()))
  )
);

CREATE POLICY "Consolidated user_company_roles delete policy" 
ON public.user_company_roles 
FOR DELETE 
USING (
  require_authenticated_user() AND 
  (
    user_is_admin_in_company((SELECT auth.uid()), company_id) OR 
    is_superadmin((SELECT auth.uid()))
  )
);

-- Also fix companies table policies for performance
DROP POLICY IF EXISTS "Consolidated companies delete policy" ON public.companies;
DROP POLICY IF EXISTS "Consolidated companies insert policy" ON public.companies;
DROP POLICY IF EXISTS "Consolidated companies select policy" ON public.companies;
DROP POLICY IF EXISTS "Consolidated companies update policy" ON public.companies;

-- Create optimized companies policies
CREATE POLICY "Consolidated companies select policy" 
ON public.companies 
FOR SELECT 
USING (
  (SELECT auth.uid()) IS NOT NULL AND 
  (((SELECT auth.jwt()) ->> 'is_anonymous')::boolean IS FALSE) AND 
  (
    id IN (SELECT get_user_admin_companies((SELECT auth.uid()))) OR
    id IN (
      SELECT ucr.company_id
      FROM user_company_roles ucr
      WHERE ucr.user_id = (SELECT auth.uid()) AND ucr.is_active = true
    ) OR 
    is_superadmin((SELECT auth.uid()))
  )
);

CREATE POLICY "Consolidated companies insert policy" 
ON public.companies 
FOR INSERT 
WITH CHECK (
  (SELECT auth.uid()) IS NOT NULL AND 
  (((SELECT auth.jwt()) ->> 'is_anonymous')::boolean IS FALSE)
);

CREATE POLICY "Consolidated companies update policy" 
ON public.companies 
FOR UPDATE 
USING (
  (SELECT auth.uid()) IS NOT NULL AND 
  (((SELECT auth.jwt()) ->> 'is_anonymous')::boolean IS FALSE) AND 
  (
    user_is_admin_in_company((SELECT auth.uid()), id) OR 
    is_superadmin((SELECT auth.uid()))
  )
)
WITH CHECK (
  (SELECT auth.uid()) IS NOT NULL AND 
  (((SELECT auth.jwt()) ->> 'is_anonymous')::boolean IS FALSE) AND 
  (
    user_is_admin_in_company((SELECT auth.uid()), id) OR 
    is_superadmin((SELECT auth.uid()))
  )
);

CREATE POLICY "Consolidated companies delete policy" 
ON public.companies 
FOR DELETE 
USING (
  (SELECT auth.uid()) IS NOT NULL AND 
  (((SELECT auth.jwt()) ->> 'is_anonymous')::boolean IS FALSE) AND 
  is_superadmin((SELECT auth.uid()))
);