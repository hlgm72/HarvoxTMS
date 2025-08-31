-- Crear función de seguridad definer optimizada para verificar si el usuario es superadmin
CREATE OR REPLACE FUNCTION public.is_user_superadmin_safe(user_id_param uuid DEFAULT NULL)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_company_roles
    WHERE user_id = COALESCE(user_id_param, (SELECT auth.uid()))
      AND role = 'superadmin'::user_role
      AND is_active = true
  );
$$;

-- Ahora actualizar la política usando la función optimizada
DROP POLICY IF EXISTS "system_alerts_superadmin_only" ON public.system_alerts;

CREATE POLICY "system_alerts_superadmin_only" ON public.system_alerts
FOR ALL
TO public
USING (
  (SELECT auth.uid()) IS NOT NULL
  AND NOT COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false)
  AND is_user_superadmin_safe((SELECT auth.uid()))
)
WITH CHECK (
  (SELECT auth.uid()) IS NOT NULL
  AND NOT COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false)
  AND is_user_superadmin_safe((SELECT auth.uid()))
);