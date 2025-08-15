-- Optimizar política RLS de password_reset_tokens para mejor rendimiento

DROP POLICY IF EXISTS "password_reset_tokens_service_only" ON password_reset_tokens;

-- Recrear política optimizada
CREATE POLICY "password_reset_tokens_service_only" 
ON password_reset_tokens 
FOR ALL 
USING (
  -- Optimizar current_setting y auth.* con SELECT
  (SELECT current_setting('app.service_operation', true)) = 'allowed' AND
  (SELECT auth.uid()) IS NOT NULL AND 
  (SELECT auth.role()) = 'authenticated' AND
  COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false
)
WITH CHECK (
  (SELECT current_setting('app.service_operation', true)) = 'allowed' AND
  (SELECT auth.uid()) IS NOT NULL AND 
  (SELECT auth.role()) = 'authenticated' AND
  COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false
);