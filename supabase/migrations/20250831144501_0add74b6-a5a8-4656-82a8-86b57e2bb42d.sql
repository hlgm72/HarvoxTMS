-- Optimizar la política RLS de system_alerts para mejor rendimiento
-- Reemplazamos auth.uid() y auth.jwt() con subconsultas (SELECT auth.uid()) para evitar re-evaluación por cada fila

DROP POLICY IF EXISTS "system_alerts_superadmin_only" ON public.system_alerts;

CREATE POLICY "system_alerts_superadmin_only" ON public.system_alerts
FOR ALL
TO public
USING (
  ((SELECT auth.uid()) IS NOT NULL) 
  AND (NOT COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous'::text)::boolean, false)) 
  AND (EXISTS ( 
    SELECT 1 FROM user_company_roles 
    WHERE user_company_roles.user_id = (SELECT auth.uid()) 
      AND user_company_roles.role = 'superadmin'::user_role 
      AND user_company_roles.is_active = true
  ))
)
WITH CHECK (
  ((SELECT auth.uid()) IS NOT NULL) 
  AND (NOT COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous'::text)::boolean, false)) 
  AND (EXISTS ( 
    SELECT 1 FROM user_company_roles 
    WHERE user_company_roles.user_id = (SELECT auth.uid()) 
      AND user_company_roles.role = 'superadmin'::user_role 
      AND user_company_roles.is_active = true
  ))
);