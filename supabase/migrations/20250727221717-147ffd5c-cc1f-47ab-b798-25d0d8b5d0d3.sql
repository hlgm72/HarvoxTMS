-- Solucionar políticas RLS para company_clients que están bloqueando el acceso

-- Eliminar política problemática existente
DROP POLICY IF EXISTS "Company clients complete policy" ON public.company_clients;

-- Crear nueva política más simple y efectiva
CREATE POLICY "Company clients access policy" 
ON public.company_clients 
FOR ALL 
TO authenticated
USING (
  is_authenticated_optimized() AND
  company_id IN (
    SELECT ucr.company_id
    FROM user_company_roles ucr
    WHERE ucr.user_id = get_current_user_id_optimized()
      AND ucr.is_active = true
  )
)
WITH CHECK (
  is_authenticated_optimized() AND
  company_id IN (
    SELECT ucr.company_id
    FROM user_company_roles ucr
    WHERE ucr.user_id = get_current_user_id_optimized()
      AND ucr.is_active = true
  )
);