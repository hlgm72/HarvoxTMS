-- Tercera ronda: Continuar resolviendo warnings de acceso anónimo
-- Arreglando tablas de equipos, cargas y gastos

-- 1. COMPANY_EQUIPMENT - Equipos de la empresa
DROP POLICY IF EXISTS "Company equipment access policy" ON public.company_equipment;
CREATE POLICY "Company equipment access policy" ON public.company_equipment
FOR ALL
TO service_role
USING (is_authenticated_company_user() AND (company_id IN ( SELECT ucr.company_id
   FROM user_company_roles ucr
  WHERE ((ucr.user_id = ( SELECT auth.uid() AS uid)) AND (ucr.is_active = true)))))
WITH CHECK (is_authenticated_company_user() AND (company_id IN ( SELECT ucr.company_id
   FROM user_company_roles ucr
  WHERE ((ucr.user_id = ( SELECT auth.uid() AS uid)) AND (ucr.is_active = true)))));

-- 2. EQUIPMENT_ASSIGNMENTS - Asignaciones de equipos
DROP POLICY IF EXISTS "Equipment assignments company access" ON public.equipment_assignments;
CREATE POLICY "Equipment assignments company access" ON public.equipment_assignments
FOR ALL
TO service_role
USING (is_authenticated_non_anon() AND ((( SELECT auth.uid() AS uid) = driver_user_id) OR (equipment_id IN ( SELECT ce.id
   FROM company_equipment ce
  WHERE (ce.company_id IN ( SELECT ucr.company_id
           FROM user_company_roles ucr
          WHERE ((ucr.user_id = ( SELECT auth.uid() AS uid)) AND (ucr.is_active = true))))))))
WITH CHECK (is_authenticated_non_anon() AND (equipment_id IN ( SELECT ce.id
   FROM company_equipment ce
  WHERE (ce.company_id IN ( SELECT ucr.company_id
           FROM user_company_roles ucr
          WHERE ((ucr.user_id = ( SELECT auth.uid() AS uid)) AND (ucr.is_active = true)))))));

-- 3. EQUIPMENT_DOCUMENTS - Documentos de equipos
DROP POLICY IF EXISTS "Equipment documents access policy" ON public.equipment_documents;
CREATE POLICY "Equipment documents access policy" ON public.equipment_documents
FOR ALL
TO service_role
USING (is_authenticated_non_anon() AND (equipment_id IN ( SELECT ce.id
   FROM company_equipment ce
  WHERE (ce.company_id IN ( SELECT ucr.company_id
           FROM user_company_roles ucr
          WHERE ((ucr.user_id = ( SELECT auth.uid() AS uid)) AND (ucr.is_active = true)))))))
WITH CHECK (is_authenticated_non_anon() AND (equipment_id IN ( SELECT ce.id
   FROM company_equipment ce
  WHERE (ce.company_id IN ( SELECT ucr.company_id
           FROM user_company_roles ucr
          WHERE ((ucr.user_id = ( SELECT auth.uid() AS uid)) AND (ucr.is_active = true)))))));

-- 4. EQUIPMENT_LOCATIONS - Ubicaciones de equipos
DROP POLICY IF EXISTS "Equipment locations company access" ON public.equipment_locations;
CREATE POLICY "Equipment locations company access" ON public.equipment_locations
FOR ALL
TO service_role
USING (is_authenticated_non_anon() AND (equipment_id IN ( SELECT ce.id
   FROM company_equipment ce
  WHERE (ce.company_id IN ( SELECT ucr.company_id
           FROM user_company_roles ucr
          WHERE ((ucr.user_id = ( SELECT auth.uid() AS uid)) AND (ucr.is_active = true)))))))
WITH CHECK (is_authenticated_non_anon() AND (equipment_id IN ( SELECT ce.id
   FROM company_equipment ce
  WHERE (ce.company_id IN ( SELECT ucr.company_id
           FROM user_company_roles ucr
          WHERE ((ucr.user_id = ( SELECT auth.uid() AS uid)) AND (ucr.is_active = true)))))));

-- 5. LOAD_DOCUMENTS - Documentos de cargas
DROP POLICY IF EXISTS "Users can view load documents from their company loads" ON public.load_documents;
CREATE POLICY "Users can view load documents from their company loads" ON public.load_documents
FOR SELECT
TO service_role
USING (require_authenticated_user() AND (load_id IN ( SELECT l.id
   FROM loads l
  WHERE ((l.driver_user_id = ( SELECT auth.uid() AS uid)) OR (l.driver_user_id IN ( SELECT ucr.user_id
           FROM user_company_roles ucr
          WHERE ((ucr.company_id IN ( SELECT ucr2.company_id
                   FROM user_company_roles ucr2
                  WHERE ((ucr2.user_id = ( SELECT auth.uid() AS uid)) AND (ucr2.is_active = true)))) AND (ucr.is_active = true))))))));

DROP POLICY IF EXISTS "Users can update load documents from their company loads" ON public.load_documents;
CREATE POLICY "Users can update load documents from their company loads" ON public.load_documents
FOR UPDATE
TO service_role
USING (require_authenticated_user() AND (load_id IN ( SELECT l.id
   FROM loads l
  WHERE ((l.driver_user_id = ( SELECT auth.uid() AS uid)) OR (l.driver_user_id IN ( SELECT ucr.user_id
           FROM user_company_roles ucr
          WHERE ((ucr.company_id IN ( SELECT ucr2.company_id
                   FROM user_company_roles ucr2
                  WHERE ((ucr2.user_id = ( SELECT auth.uid() AS uid)) AND (ucr2.is_active = true)))) AND (ucr.is_active = true))))))))
WITH CHECK (require_authenticated_user() AND (load_id IN ( SELECT l.id
   FROM loads l
  WHERE ((l.driver_user_id = ( SELECT auth.uid() AS uid)) OR (l.driver_user_id IN ( SELECT ucr.user_id
           FROM user_company_roles ucr
          WHERE ((ucr.company_id IN ( SELECT ucr2.company_id
                   FROM user_company_roles ucr2
                  WHERE ((ucr2.user_id = ( SELECT auth.uid() AS uid)) AND (ucr2.is_active = true)))) AND (ucr.is_active = true))))))));

DROP POLICY IF EXISTS "Users can delete load documents from their company loads" ON public.load_documents;
CREATE POLICY "Users can delete load documents from their company loads" ON public.load_documents
FOR DELETE
TO service_role
USING (require_authenticated_user() AND (load_id IN ( SELECT l.id
   FROM loads l
  WHERE ((l.driver_user_id = ( SELECT auth.uid() AS uid)) OR (l.driver_user_id IN ( SELECT ucr.user_id
           FROM user_company_roles ucr
          WHERE ((ucr.company_id IN ( SELECT ucr2.company_id
                   FROM user_company_roles ucr2
                  WHERE ((ucr2.user_id = ( SELECT auth.uid() AS uid)) AND (ucr2.is_active = true)))) AND (ucr.is_active = true))))))));

-- 6. LOAD_STOPS - Paradas de cargas
DROP POLICY IF EXISTS "Load stops access policy" ON public.load_stops;
CREATE POLICY "Load stops access policy" ON public.load_stops
FOR ALL
TO service_role
USING (require_authenticated_user() AND (load_id IN ( SELECT l.id
   FROM loads l
  WHERE ((l.driver_user_id = ( SELECT auth.uid() AS uid)) OR (l.driver_user_id IN ( SELECT ucr.user_id
           FROM user_company_roles ucr
          WHERE ((ucr.company_id IN ( SELECT ucr2.company_id
                   FROM user_company_roles ucr2
                  WHERE ((ucr2.user_id = ( SELECT auth.uid() AS uid)) AND (ucr2.is_active = true)))) AND (ucr.is_active = true))))))))
WITH CHECK (require_authenticated_user() AND (load_id IN ( SELECT l.id
   FROM loads l
  WHERE ((l.driver_user_id = ( SELECT auth.uid() AS uid)) OR (l.driver_user_id IN ( SELECT ucr.user_id
           FROM user_company_roles ucr
          WHERE ((ucr.company_id IN ( SELECT ucr2.company_id
                   FROM user_company_roles ucr2
                  WHERE ((ucr2.user_id = ( SELECT auth.uid() AS uid)) AND (ucr2.is_active = true)))) AND (ucr.is_active = true))))))));

-- 7. OTHER_INCOME - Otros ingresos
DROP POLICY IF EXISTS "Other income comprehensive policy" ON public.other_income;
CREATE POLICY "Other income comprehensive policy" ON public.other_income
FOR ALL
TO service_role
USING (require_authenticated_user() AND ((( SELECT auth.uid() AS uid) = driver_user_id) OR (driver_user_id IN ( SELECT ucr.user_id
   FROM user_company_roles ucr
  WHERE ((ucr.company_id IN ( SELECT ucr2.company_id
           FROM user_company_roles ucr2
          WHERE ((ucr2.user_id = ( SELECT auth.uid() AS uid)) AND (ucr2.is_active = true)))) AND (ucr.is_active = true))))))
WITH CHECK (require_authenticated_user() AND (driver_user_id IN ( SELECT ucr.user_id
   FROM user_company_roles ucr
  WHERE ((ucr.company_id IN ( SELECT ucr2.company_id
           FROM user_company_roles ucr2
          WHERE ((ucr2.user_id = ( SELECT auth.uid() AS uid)) AND (ucr2.is_active = true)))) AND (ucr.is_active = true)))) AND (NOT is_period_locked(payment_period_id)));