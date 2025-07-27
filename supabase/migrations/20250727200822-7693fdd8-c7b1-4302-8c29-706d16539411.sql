-- Eliminar warnings de seguridad para tablas de catálogos públicos
-- Estas tablas contienen información de referencia no sensible

-- Fuel Card Providers - Permitir lectura pública
DROP POLICY IF EXISTS "Users can view fuel card providers" ON public.fuel_card_providers;
CREATE POLICY "Public access to fuel card providers" ON public.fuel_card_providers
FOR SELECT
TO public
USING (true);

-- Mantener políticas restrictivas para modificación (solo para managers autenticados)
-- Las políticas de INSERT, UPDATE y DELETE existentes se mantienen

-- Maintenance Types - Permitir lectura pública
DROP POLICY IF EXISTS "Maintenance types read access" ON public.maintenance_types;
CREATE POLICY "Public access to maintenance types" ON public.maintenance_types
FOR SELECT
TO public
USING (true);

-- Expense Types - Permitir lectura pública
DROP POLICY IF EXISTS "Expense types complete policy" ON public.expense_types;

-- Crear políticas separadas para expense_types
CREATE POLICY "Public access to expense types" ON public.expense_types
FOR SELECT
TO public
USING (true);

CREATE POLICY "Authenticated users can modify expense types" ON public.expense_types
FOR ALL
TO authenticated
USING (
  (SELECT auth.uid()) IS NOT NULL AND (EXISTS ( 
    SELECT 1 FROM user_company_roles 
    WHERE user_id = (SELECT auth.uid()) AND is_active = true
  ))
)
WITH CHECK (
  (SELECT auth.uid()) IS NOT NULL AND (EXISTS ( 
    SELECT 1 FROM user_company_roles 
    WHERE user_id = (SELECT auth.uid()) AND is_active = true
  ))
);