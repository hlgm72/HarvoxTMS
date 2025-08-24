-- Continue fixing security issues for remaining tables
-- Create secure policies for tables that don't have RLS yet

-- =======================
-- 4. Secure profiles table with proper RLS
-- =======================
-- Enable RLS on profiles if not already enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- =======================
-- 5. Secure owner_operators table with proper RLS
-- =======================
-- Enable RLS on owner_operators if not already enabled  
ALTER TABLE public.owner_operators ENABLE ROW LEVEL SECURITY;

-- Update owner_operators policy to be more restrictive
DROP POLICY IF EXISTS "Owner operators secure company access" ON public.owner_operators;

CREATE POLICY "Owner operators secure company access" 
ON public.owner_operators 
FOR ALL 
USING (
  auth.role() = 'authenticated' AND
  auth.uid() IS NOT NULL AND
  NOT COALESCE((auth.jwt() ->> 'is_anonymous')::boolean, false) AND
  (
    -- Users can see their own owner operator record
    user_id = auth.uid() OR
    -- Company admins can see owner operators in their company
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
  auth.role() = 'authenticated' AND
  auth.uid() IS NOT NULL AND
  NOT COALESCE((auth.jwt() ->> 'is_anonymous')::boolean, false) AND
  user_id = auth.uid()
);