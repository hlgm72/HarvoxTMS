-- Corregir políticas RLS con verificación explícita de usuarios no anónimos

-- Eliminar políticas problemáticas
DROP POLICY IF EXISTS "Company clients secure policy" ON public.company_clients;
DROP POLICY IF EXISTS "Company client contacts secure policy" ON public.company_client_contacts;

-- Crear políticas correctas para company_clients
CREATE POLICY "Company clients authenticated only" 
ON public.company_clients 
FOR ALL 
TO authenticated
USING (
  auth.role() = 'authenticated' AND
  auth.uid() IS NOT NULL AND 
  (auth.jwt()->>'is_anonymous')::boolean IS FALSE AND
  company_id IN (
    SELECT ucr.company_id
    FROM user_company_roles ucr
    WHERE ucr.user_id = auth.uid()
      AND ucr.is_active = true
  )
)
WITH CHECK (
  auth.role() = 'authenticated' AND
  auth.uid() IS NOT NULL AND 
  (auth.jwt()->>'is_anonymous')::boolean IS FALSE AND
  company_id IN (
    SELECT ucr.company_id
    FROM user_company_roles ucr
    WHERE ucr.user_id = auth.uid()
      AND ucr.is_active = true
  )
);

-- Crear políticas correctas para company_client_contacts
CREATE POLICY "Company client contacts authenticated only" 
ON public.company_client_contacts 
FOR ALL 
TO authenticated
USING (
  auth.role() = 'authenticated' AND
  auth.uid() IS NOT NULL AND 
  (auth.jwt()->>'is_anonymous')::boolean IS FALSE AND
  client_id IN (
    SELECT cc.id
    FROM company_clients cc
    JOIN user_company_roles ucr ON cc.company_id = ucr.company_id
    WHERE ucr.user_id = auth.uid()
      AND ucr.is_active = true
  )
)
WITH CHECK (
  auth.role() = 'authenticated' AND
  auth.uid() IS NOT NULL AND 
  (auth.jwt()->>'is_anonymous')::boolean IS FALSE AND
  client_id IN (
    SELECT cc.id
    FROM company_clients cc
    JOIN user_company_roles ucr ON cc.company_id = ucr.company_id
    WHERE ucr.user_id = auth.uid()
      AND ucr.is_active = true
  )
);

-- Corregir también las políticas de company_payment_periods
DROP POLICY IF EXISTS "Company payment periods delete policy" ON public.company_payment_periods;
DROP POLICY IF EXISTS "Company payment periods select policy" ON public.company_payment_periods;
DROP POLICY IF EXISTS "Company payment periods update policy" ON public.company_payment_periods;

CREATE POLICY "Company payment periods authenticated access" 
ON public.company_payment_periods 
FOR ALL 
TO authenticated
USING (
  auth.role() = 'authenticated' AND
  auth.uid() IS NOT NULL AND 
  (auth.jwt()->>'is_anonymous')::boolean IS FALSE AND
  (company_id IN (
    SELECT ucr.company_id
    FROM user_company_roles ucr
    WHERE ucr.user_id = auth.uid()
      AND ucr.is_active = true
      AND ucr.role IN ('company_owner', 'operations_manager', 'superadmin')
  ) OR EXISTS (
    SELECT 1 FROM user_company_roles 
    WHERE user_id = auth.uid() 
    AND role = 'superadmin' 
    AND is_active = true
  ))
)
WITH CHECK (
  auth.role() = 'authenticated' AND
  auth.uid() IS NOT NULL AND 
  (auth.jwt()->>'is_anonymous')::boolean IS FALSE AND
  (company_id IN (
    SELECT ucr.company_id
    FROM user_company_roles ucr
    WHERE ucr.user_id = auth.uid()
      AND ucr.is_active = true
      AND ucr.role IN ('company_owner', 'operations_manager', 'superadmin')
  ) OR EXISTS (
    SELECT 1 FROM user_company_roles 
    WHERE user_id = auth.uid() 
    AND role = 'superadmin' 
    AND is_active = true
  ))
);