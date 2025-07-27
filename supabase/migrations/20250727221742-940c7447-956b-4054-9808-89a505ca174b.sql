-- Corregir también las políticas de company_client_contacts

-- Eliminar política problemática existente
DROP POLICY IF EXISTS "Company client contacts complete policy" ON public.company_client_contacts;

-- Crear nueva política optimizada para contactos
CREATE POLICY "Company client contacts access policy" 
ON public.company_client_contacts 
FOR ALL 
TO authenticated
USING (
  is_authenticated_optimized() AND
  client_id IN (
    SELECT cc.id
    FROM company_clients cc
    JOIN user_company_roles ucr ON cc.company_id = ucr.company_id
    WHERE ucr.user_id = get_current_user_id_optimized()
      AND ucr.is_active = true
  )
)
WITH CHECK (
  is_authenticated_optimized() AND
  client_id IN (
    SELECT cc.id
    FROM company_clients cc
    JOIN user_company_roles ucr ON cc.company_id = ucr.company_id
    WHERE ucr.user_id = get_current_user_id_optimized()
      AND ucr.is_active = true
  )
);