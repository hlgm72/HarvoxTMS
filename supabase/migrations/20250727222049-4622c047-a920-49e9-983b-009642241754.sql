-- Corregir políticas RLS para evitar acceso anónimo

-- Eliminar políticas problemáticas de company_clients
DROP POLICY IF EXISTS "Company clients access policy" ON public.company_clients;

-- Crear nueva política restrictiva para company_clients
CREATE POLICY "Company clients secure policy" 
ON public.company_clients 
FOR ALL 
TO authenticated
USING (
  is_authenticated_non_anon() AND
  company_id IN (
    SELECT ucr.company_id
    FROM user_company_roles ucr
    WHERE ucr.user_id = get_current_user_id_optimized()
      AND ucr.is_active = true
  )
)
WITH CHECK (
  is_authenticated_non_anon() AND
  company_id IN (
    SELECT ucr.company_id
    FROM user_company_roles ucr
    WHERE ucr.user_id = get_current_user_id_optimized()
      AND ucr.is_active = true
  )
);

-- Eliminar políticas problemáticas de company_client_contacts
DROP POLICY IF EXISTS "Company client contacts access policy" ON public.company_client_contacts;

-- Crear nueva política restrictiva para company_client_contacts
CREATE POLICY "Company client contacts secure policy" 
ON public.company_client_contacts 
FOR ALL 
TO authenticated
USING (
  is_authenticated_non_anon() AND
  client_id IN (
    SELECT cc.id
    FROM company_clients cc
    JOIN user_company_roles ucr ON cc.company_id = ucr.company_id
    WHERE ucr.user_id = get_current_user_id_optimized()
      AND ucr.is_active = true
  )
)
WITH CHECK (
  is_authenticated_non_anon() AND
  client_id IN (
    SELECT cc.id
    FROM company_clients cc
    JOIN user_company_roles ucr ON cc.company_id = ucr.company_id
    WHERE ucr.user_id = get_current_user_id_optimized()
      AND ucr.is_active = true
  )
);