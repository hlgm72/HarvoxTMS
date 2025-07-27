-- Fix infinite recursion and performance issues in RLS policies
-- Create security definer functions to avoid recursion and optimize auth calls

-- Create security definer functions to avoid recursion
CREATE OR REPLACE FUNCTION public.get_current_user_id()
RETURNS UUID AS $$
  SELECT auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT AS $$
  SELECT auth.role();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_current_user_anonymous()
RETURNS BOOLEAN AS $$
  SELECT COALESCE((auth.jwt()->>'is_anonymous')::boolean, false);
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.get_user_companies(user_id_param UUID)
RETURNS TABLE(company_id UUID) AS $$
  SELECT ucr.company_id
  FROM public.user_company_roles ucr
  WHERE ucr.user_id = user_id_param 
  AND ucr.is_active = true;
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.get_user_admin_companies(user_id_param UUID)
RETURNS TABLE(company_id UUID) AS $$
  SELECT ucr.company_id
  FROM public.user_company_roles ucr
  WHERE ucr.user_id = user_id_param 
  AND ucr.is_active = true
  AND ucr.role IN ('company_owner', 'operations_manager', 'superadmin');
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_user_superadmin(user_id_param UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_company_roles ucr
    WHERE ucr.user_id = user_id_param 
    AND ucr.role = 'superadmin' 
    AND ucr.is_active = true
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_user_company_owner(user_id_param UUID, company_id_param UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_company_roles ucr
    WHERE ucr.user_id = user_id_param 
    AND ucr.company_id = company_id_param
    AND ucr.role = 'company_owner' 
    AND ucr.is_active = true
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Fix company_payment_periods policies with optimized auth calls and security definer functions
DROP POLICY IF EXISTS "Company payment periods select policy" ON public.company_payment_periods;
DROP POLICY IF EXISTS "Company payment periods insert policy" ON public.company_payment_periods;
DROP POLICY IF EXISTS "Company payment periods update policy" ON public.company_payment_periods;
DROP POLICY IF EXISTS "Company payment periods delete policy" ON public.company_payment_periods;

CREATE POLICY "Company payment periods select policy" 
ON public.company_payment_periods 
FOR SELECT 
USING (
  public.get_current_user_role() = 'authenticated' AND
  public.get_current_user_id() IS NOT NULL AND 
  public.is_current_user_anonymous() IS FALSE AND
  (company_id IN (SELECT public.get_user_companies(public.get_current_user_id())))
);

CREATE POLICY "Company payment periods insert policy" 
ON public.company_payment_periods 
FOR INSERT 
WITH CHECK (
  (public.get_current_user_role() = 'service_role') OR 
  (
    public.get_current_user_role() = 'authenticated' AND
    public.get_current_user_id() IS NOT NULL AND 
    public.is_current_user_anonymous() IS FALSE AND
    company_id IN (SELECT public.get_user_admin_companies(public.get_current_user_id()))
  )
);

CREATE POLICY "Company payment periods update policy" 
ON public.company_payment_periods 
FOR UPDATE 
USING (
  public.get_current_user_role() = 'authenticated' AND
  public.get_current_user_id() IS NOT NULL AND 
  public.is_current_user_anonymous() IS FALSE AND
  (company_id IN (SELECT public.get_user_companies(public.get_current_user_id())))
)
WITH CHECK (
  public.get_current_user_role() = 'authenticated' AND
  public.get_current_user_id() IS NOT NULL AND 
  public.is_current_user_anonymous() IS FALSE AND
  (company_id IN (SELECT public.get_user_companies(public.get_current_user_id())))
);

CREATE POLICY "Company payment periods delete policy" 
ON public.company_payment_periods 
FOR DELETE 
USING (
  public.get_current_user_role() = 'authenticated' AND
  public.get_current_user_id() IS NOT NULL AND 
  public.is_current_user_anonymous() IS FALSE AND
  public.is_user_company_owner(public.get_current_user_id(), company_id)
);

-- Fix user_company_roles policies to avoid recursion
DROP POLICY IF EXISTS "user_company_roles_select_policy" ON public.user_company_roles;
DROP POLICY IF EXISTS "user_company_roles_insert_policy" ON public.user_company_roles;
DROP POLICY IF EXISTS "user_company_roles_update_policy" ON public.user_company_roles;
DROP POLICY IF EXISTS "user_company_roles_delete_policy" ON public.user_company_roles;

CREATE POLICY "user_company_roles_select_policy" 
ON public.user_company_roles 
FOR SELECT 
USING (
  public.get_current_user_role() = 'authenticated' AND
  public.get_current_user_id() IS NOT NULL AND 
  public.is_current_user_anonymous() IS FALSE AND
  (
    -- Users can see their own roles
    user_id = public.get_current_user_id() OR
    -- Or company admins can see roles in their companies
    (company_id IN (SELECT public.get_user_admin_companies(public.get_current_user_id()))) OR
    -- Or superadmin can see all
    public.is_user_superadmin(public.get_current_user_id())
  )
);

CREATE POLICY "user_company_roles_insert_policy" 
ON public.user_company_roles 
FOR INSERT 
WITH CHECK (
  (public.get_current_user_role() = 'service_role') OR 
  (
    public.get_current_user_role() = 'authenticated' AND
    public.get_current_user_id() IS NOT NULL AND 
    public.is_current_user_anonymous() IS FALSE AND
    (
      -- Company owners can assign roles in their company
      public.is_user_company_owner(public.get_current_user_id(), company_id) OR
      -- Superadmin can assign any role
      public.is_user_superadmin(public.get_current_user_id())
    )
  )
);

CREATE POLICY "user_company_roles_update_policy" 
ON public.user_company_roles 
FOR UPDATE 
USING (
  public.get_current_user_role() = 'authenticated' AND
  public.get_current_user_id() IS NOT NULL AND 
  public.is_current_user_anonymous() IS FALSE AND
  (
    -- Company owners can update roles in their company
    public.is_user_company_owner(public.get_current_user_id(), company_id) OR
    -- Superadmin can update any role
    public.is_user_superadmin(public.get_current_user_id())
  )
)
WITH CHECK (
  public.get_current_user_role() = 'authenticated' AND
  public.get_current_user_id() IS NOT NULL AND 
  public.is_current_user_anonymous() IS FALSE AND
  (
    -- Company owners can update roles in their company
    public.is_user_company_owner(public.get_current_user_id(), company_id) OR
    -- Superadmin can update any role
    public.is_user_superadmin(public.get_current_user_id())
  )
);

CREATE POLICY "user_company_roles_delete_policy" 
ON public.user_company_roles 
FOR DELETE 
USING (
  public.get_current_user_role() = 'authenticated' AND
  public.get_current_user_id() IS NOT NULL AND 
  public.is_current_user_anonymous() IS FALSE AND
  (
    -- Company owners can delete roles in their company (except their own company_owner role)
    (public.is_user_company_owner(public.get_current_user_id(), company_id) AND 
     NOT (user_id = public.get_current_user_id() AND role = 'company_owner')) OR
    -- Superadmin can delete any role (except their own superadmin role)
    (public.is_user_superadmin(public.get_current_user_id()) AND 
     NOT (user_id = public.get_current_user_id() AND role = 'superadmin'))
  )
);