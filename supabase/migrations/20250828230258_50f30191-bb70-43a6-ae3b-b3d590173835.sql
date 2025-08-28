-- Corregir la política de recurring_expense_exclusions para evitar acceso anónimo
-- La política actual permite acceso a usuarios autenticados pero no verifica que NO sean anónimos

DROP POLICY IF EXISTS exclusions_authorized_access ON public.recurring_expense_exclusions;

CREATE POLICY exclusions_authorized_access ON public.recurring_expense_exclusions
FOR ALL 
TO authenticated
USING (
  -- Verificar que el usuario NO es anónimo Y tiene acceso autorizado
  (auth.jwt()->>'is_anonymous')::boolean IS FALSE 
  AND has_exclusion_access(user_id, payment_period_id, auth.uid())
)
WITH CHECK (
  -- Misma verificación para escritura
  (auth.jwt()->>'is_anonymous')::boolean IS FALSE 
  AND has_exclusion_access(user_id, payment_period_id, auth.uid())
);