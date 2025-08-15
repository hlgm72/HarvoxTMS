-- Arreglar políticas RLS para password_reset_tokens para prevenir acceso anónimo

-- Eliminar la política problemática
DROP POLICY IF EXISTS "password_reset_tokens_service_only" ON password_reset_tokens;

-- Crear nueva política más segura que explícitamente excluye usuarios anónimos
CREATE POLICY "password_reset_tokens_service_only" 
ON password_reset_tokens 
FOR ALL 
USING (
  -- Solo permitir acceso cuando el servicio está habilitado Y el usuario está autenticado (no anónimo)
  current_setting('app.service_operation', true) = 'allowed' AND
  auth.uid() IS NOT NULL AND 
  auth.role() = 'authenticated' AND
  COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false
)
WITH CHECK (
  current_setting('app.service_operation', true) = 'allowed' AND
  auth.uid() IS NOT NULL AND 
  auth.role() = 'authenticated' AND
  COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false
);