-- Habilitar RLS y crear políticas para system_alerts
ALTER TABLE public.system_alerts ENABLE ROW LEVEL SECURITY;

-- Solo superadmins pueden ver las alertas del sistema
CREATE POLICY "system_alerts_superadmin_only" ON public.system_alerts
  FOR ALL
  USING (
    auth.uid() IS NOT NULL AND
    NOT COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) AND
    EXISTS (
      SELECT 1 FROM user_company_roles
      WHERE user_id = auth.uid()
      AND role = 'superadmin'
      AND is_active = true
    )
  )
  WITH CHECK (
    auth.uid() IS NOT NULL AND
    NOT COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) AND
    EXISTS (
      SELECT 1 FROM user_company_roles
      WHERE user_id = auth.uid()
      AND role = 'superadmin'
      AND is_active = true
    )
  );