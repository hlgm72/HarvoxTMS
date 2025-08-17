-- Corregir trigger existente
DROP TRIGGER IF EXISTS audit_company_modifications ON companies;

-- Crear función de auditoría mejorada solo para operaciones de escritura
CREATE OR REPLACE FUNCTION public.log_company_write_access()
RETURNS TRIGGER AS $$
BEGIN
  -- Registrar modificaciones a datos de empresa
  INSERT INTO company_sensitive_data_access_log (
    company_id, 
    accessed_by, 
    access_type,
    user_role,
    accessed_at
  ) VALUES (
    COALESCE(NEW.id, OLD.id),
    auth.uid(),
    CASE 
      WHEN TG_OP = 'INSERT' THEN 'company_created'
      WHEN TG_OP = 'UPDATE' THEN 'company_modified'
      WHEN TG_OP = 'DELETE' THEN 'company_deleted'
    END,
    (SELECT role FROM user_company_roles WHERE user_id = auth.uid() AND company_id = COALESCE(NEW.id, OLD.id) AND is_active = true LIMIT 1),
    now()
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- Crear trigger para auditar modificaciones
CREATE TRIGGER audit_company_modifications
  AFTER INSERT OR UPDATE OR DELETE ON companies
  FOR EACH ROW
  EXECUTE FUNCTION public.log_company_write_access();

-- Verificar que las nuevas políticas de seguridad estén activas
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  cmd 
FROM pg_policies 
WHERE tablename = 'companies' 
ORDER BY policyname;