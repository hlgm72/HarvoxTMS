-- Arreglar las políticas RLS de expense_types para que funcionen correctamente
DROP POLICY IF EXISTS "Expense types complete policy" ON public.expense_types;

-- Crear política más permisiva para expense_types (datos de referencia)
CREATE POLICY "Expense types public access" 
ON public.expense_types 
FOR ALL 
USING (
  -- Los tipos de gastos son datos de referencia, permitir a todos los usuarios autenticados no anónimos
  (SELECT auth.uid()) IS NOT NULL 
  AND ((SELECT auth.jwt())->>'is_anonymous')::boolean IS FALSE
)
WITH CHECK (
  -- Solo superadmin puede crear/modificar tipos de gastos
  (SELECT auth.uid()) IS NOT NULL 
  AND ((SELECT auth.jwt())->>'is_anonymous')::boolean IS FALSE
  AND EXISTS (
    SELECT 1 FROM user_company_roles 
    WHERE user_id = (SELECT auth.uid()) 
    AND role = 'superadmin' 
    AND is_active = true
  )
);