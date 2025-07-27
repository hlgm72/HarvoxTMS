-- Quinta ronda final corregida: Arreglando las tablas restantes más importantes
-- Enfoque en expense_types, fuel_card_providers, owner_operators, etc.

-- 1. EXPENSE_TYPES - Tipos de gastos (importante para el sistema)
DROP POLICY IF EXISTS "Expense types complete policy" ON public.expense_types;
CREATE POLICY "Expense types complete policy" ON public.expense_types
FOR ALL
TO service_role
USING (is_authenticated_company_user())
WITH CHECK (is_authenticated_company_user());

-- 2. FUEL_CARD_PROVIDERS - Proveedores de tarjetas (ya tiene algunas políticas, completar)
DROP POLICY IF EXISTS "Users can view fuel card providers" ON public.fuel_card_providers;
CREATE POLICY "Users can view fuel card providers" ON public.fuel_card_providers
FOR SELECT
TO service_role
USING (is_authenticated_company_user());

DROP POLICY IF EXISTS "Company managers can update fuel card providers" ON public.fuel_card_providers;
CREATE POLICY "Company managers can update fuel card providers" ON public.fuel_card_providers
FOR UPDATE
TO service_role
USING (is_authenticated_company_user() AND (EXISTS ( SELECT 1
   FROM user_company_roles ucr
  WHERE ((ucr.user_id = ( SELECT auth.uid() AS uid)) AND (ucr.role = ANY (ARRAY['company_owner'::user_role, 'operations_manager'::user_role, 'superadmin'::user_role])) AND (ucr.is_active = true)))))
WITH CHECK (is_authenticated_company_user() AND (EXISTS ( SELECT 1
   FROM user_company_roles ucr
  WHERE ((ucr.user_id = ( SELECT auth.uid() AS uid)) AND (ucr.role = ANY (ARRAY['company_owner'::user_role, 'operations_manager'::user_role, 'superadmin'::user_role])) AND (ucr.is_active = true)))));

DROP POLICY IF EXISTS "Company managers can delete fuel card providers" ON public.fuel_card_providers;
CREATE POLICY "Company managers can delete fuel card providers" ON public.fuel_card_providers
FOR DELETE
TO service_role
USING (is_authenticated_company_user() AND (EXISTS ( SELECT 1
   FROM user_company_roles ucr
  WHERE ((ucr.user_id = ( SELECT auth.uid() AS uid)) AND (ucr.role = ANY (ARRAY['company_owner'::user_role, 'operations_manager'::user_role, 'superadmin'::user_role])) AND (ucr.is_active = true)))));

-- 3. OWNER_OPERATORS - Propietarios-operadores
DROP POLICY IF EXISTS "Owner operators complete policy" ON public.owner_operators;
CREATE POLICY "Owner operators complete policy" ON public.owner_operators
FOR ALL
TO service_role
USING (require_authenticated_user() AND ((( SELECT auth.uid() AS uid) = user_id) OR (user_id IN ( SELECT ucr.user_id
   FROM user_company_roles ucr
  WHERE ((ucr.company_id IN ( SELECT ucr2.company_id
           FROM user_company_roles ucr2
          WHERE ((ucr2.user_id = ( SELECT auth.uid() AS uid)) AND (ucr2.is_active = true)))) AND (ucr.is_active = true))))))
WITH CHECK (require_authenticated_user() AND (( SELECT auth.uid() AS uid) = user_id));

-- 4. RECURRING_EXPENSE_TEMPLATES - Plantillas de gastos recurrentes
DROP POLICY IF EXISTS "recurring_expense_templates_select_policy" ON public.recurring_expense_templates;
CREATE POLICY "recurring_expense_templates_select_policy" ON public.recurring_expense_templates
FOR SELECT
TO service_role
USING (require_authenticated_user() AND (driver_user_id IN ( SELECT ucr.user_id
   FROM user_company_roles ucr
  WHERE ((ucr.company_id IN ( SELECT ucr2.company_id
           FROM user_company_roles ucr2
          WHERE ((ucr2.user_id = ( SELECT auth.uid() AS uid)) AND (ucr2.is_active = true)))) AND (ucr.is_active = true)))));

DROP POLICY IF EXISTS "recurring_expense_templates_update_policy" ON public.recurring_expense_templates;
CREATE POLICY "recurring_expense_templates_update_policy" ON public.recurring_expense_templates
FOR UPDATE
TO service_role
USING (require_authenticated_user() AND (driver_user_id IN ( SELECT ucr.user_id
   FROM user_company_roles ucr
  WHERE ((ucr.company_id IN ( SELECT ucr2.company_id
           FROM user_company_roles ucr2
          WHERE ((ucr2.user_id = ( SELECT auth.uid() AS uid)) AND (ucr2.is_active = true)))) AND (ucr.is_active = true)))))
WITH CHECK (require_authenticated_user() AND (driver_user_id IN ( SELECT ucr.user_id
   FROM user_company_roles ucr
  WHERE ((ucr.company_id IN ( SELECT ucr2.company_id
           FROM user_company_roles ucr2
          WHERE ((ucr2.user_id = ( SELECT auth.uid() AS uid)) AND (ucr2.is_active = true)))) AND (ucr.is_active = true)))));

DROP POLICY IF EXISTS "recurring_expense_templates_delete_policy" ON public.recurring_expense_templates;
CREATE POLICY "recurring_expense_templates_delete_policy" ON public.recurring_expense_templates
FOR DELETE
TO service_role
USING (require_authenticated_user() AND (driver_user_id IN ( SELECT ucr.user_id
   FROM user_company_roles ucr
  WHERE ((ucr.company_id IN ( SELECT ucr2.company_id
           FROM user_company_roles ucr2
          WHERE ((ucr2.user_id = ( SELECT auth.uid() AS uid)) AND (ucr2.is_active = true)))) AND (ucr.is_active = true)))));

-- 5. USER_INVITATIONS - Invitaciones de usuarios (corregido con 'email' en lugar de 'invited_email')
DROP POLICY IF EXISTS "Users can view their invitations" ON public.user_invitations;
CREATE POLICY "Users can view their invitations" ON public.user_invitations
FOR SELECT
TO service_role
USING (require_authenticated_user() AND (email = (SELECT email FROM auth.users WHERE id = auth.uid())));

DROP POLICY IF EXISTS "Users can accept their invitations" ON public.user_invitations;
CREATE POLICY "Users can accept their invitations" ON public.user_invitations
FOR UPDATE
TO service_role
USING (require_authenticated_user() AND (email = (SELECT email FROM auth.users WHERE id = auth.uid())))
WITH CHECK (require_authenticated_user() AND (email = (SELECT email FROM auth.users WHERE id = auth.uid())));

-- 6. EXPENSE_TEMPLATE_HISTORY - Historial de plantillas de gastos
DROP POLICY IF EXISTS "Expense template history complete policy" ON public.expense_template_history;
CREATE POLICY "Expense template history complete policy" ON public.expense_template_history
FOR ALL
TO service_role
USING (require_authenticated_user() AND (template_id IN ( SELECT ret.id
   FROM (recurring_expense_templates ret
     JOIN user_company_roles ucr ON ((ret.driver_user_id = ucr.user_id)))
  WHERE ((ucr.company_id IN ( SELECT ucr2.company_id
           FROM user_company_roles ucr2
          WHERE ((ucr2.user_id = ( SELECT auth.uid() AS uid)) AND (ucr2.is_active = true)))) AND (ucr.is_active = true)))))
WITH CHECK (require_authenticated_user() AND (template_id IN ( SELECT ret.id
   FROM (recurring_expense_templates ret
     JOIN user_company_roles ucr ON ((ret.driver_user_id = ucr.user_id)))
  WHERE ((ucr.company_id IN ( SELECT ucr2.company_id
           FROM user_company_roles ucr2
          WHERE ((ucr2.user_id = ( SELECT auth.uid() AS uid)) AND (ucr2.is_active = true)))) AND (ucr.is_active = true)))));