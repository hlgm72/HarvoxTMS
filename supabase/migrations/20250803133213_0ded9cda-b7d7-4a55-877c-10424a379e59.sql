-- Arreglar función con search_path mutable
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = 'public';

-- Arreglar políticas RLS para company_dispatchers
-- Eliminar políticas existentes
DROP POLICY IF EXISTS "Company owners can manage dispatchers" ON public.company_dispatchers;
DROP POLICY IF EXISTS "Operations managers can view dispatchers" ON public.company_dispatchers;
DROP POLICY IF EXISTS "Dispatchers can view their own record" ON public.company_dispatchers;

-- Crear nuevas políticas que requieren autenticación
CREATE POLICY "Company owners can manage dispatchers"
ON public.company_dispatchers
FOR ALL
USING (
  auth.role() = 'authenticated' AND
  auth.uid() IS NOT NULL AND
  COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false AND
  company_id IN (
    SELECT company_id FROM user_company_roles 
    WHERE user_id = auth.uid() AND role = 'company_owner' AND is_active = true
  )
);

CREATE POLICY "Operations managers can view dispatchers"
ON public.company_dispatchers
FOR SELECT
USING (
  auth.role() = 'authenticated' AND
  auth.uid() IS NOT NULL AND
  COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false AND
  company_id IN (
    SELECT company_id FROM user_company_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('operations_manager', 'company_owner') 
    AND is_active = true
  )
);

CREATE POLICY "Dispatchers can view their own record"
ON public.company_dispatchers
FOR SELECT
USING (
  auth.role() = 'authenticated' AND
  auth.uid() IS NOT NULL AND
  COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false AND
  user_id = auth.uid()
);

-- Arreglar políticas RLS para dispatcher_other_income
-- Eliminar políticas existentes
DROP POLICY IF EXISTS "Company owners can manage dispatcher income" ON public.dispatcher_other_income;
DROP POLICY IF EXISTS "Operations managers can manage dispatcher income" ON public.dispatcher_other_income;
DROP POLICY IF EXISTS "Dispatchers can view their own income" ON public.dispatcher_other_income;

-- Crear nuevas políticas que requieren autenticación
CREATE POLICY "Company owners can manage dispatcher income"
ON public.dispatcher_other_income
FOR ALL
USING (
  auth.role() = 'authenticated' AND
  auth.uid() IS NOT NULL AND
  COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false AND
  company_id IN (
    SELECT company_id FROM user_company_roles 
    WHERE user_id = auth.uid() AND role = 'company_owner' AND is_active = true
  )
);

CREATE POLICY "Operations managers can manage dispatcher income"
ON public.dispatcher_other_income
FOR ALL
USING (
  auth.role() = 'authenticated' AND
  auth.uid() IS NOT NULL AND
  COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false AND
  company_id IN (
    SELECT company_id FROM user_company_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('operations_manager', 'company_owner') 
    AND is_active = true
  )
);

CREATE POLICY "Dispatchers can view their own income"
ON public.dispatcher_other_income
FOR SELECT
USING (
  auth.role() = 'authenticated' AND
  auth.uid() IS NOT NULL AND
  COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false AND
  dispatcher_user_id = auth.uid()
);