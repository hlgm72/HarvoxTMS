-- Migración masiva para corregir la mayoría de políticas restantes

-- Crear función específica para verificar roles autenticados no anónimos
CREATE OR REPLACE FUNCTION public.is_authenticated_non_anon()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    (SELECT auth.role()) = 'authenticated' AND
    (SELECT auth.uid()) IS NOT NULL AND 
    (SELECT (auth.jwt()->>'is_anonymous')::boolean) IS FALSE;
$$;

-- Equipment-related policies
DROP POLICY IF EXISTS "Equipment assignments company access" ON public.equipment_assignments;
CREATE POLICY "Equipment assignments company access" ON public.equipment_assignments
FOR ALL TO authenticated
USING (
  public.is_authenticated_non_anon() AND (
    (SELECT auth.uid()) = driver_user_id OR 
    equipment_id IN (
      SELECT ce.id FROM company_equipment ce
      WHERE ce.company_id IN (
        SELECT ucr.company_id FROM user_company_roles ucr
        WHERE ucr.user_id = (SELECT auth.uid()) AND ucr.is_active = true
      )
    )
  )
)
WITH CHECK (
  public.is_authenticated_non_anon() AND 
  equipment_id IN (
    SELECT ce.id FROM company_equipment ce
    WHERE ce.company_id IN (
      SELECT ucr.company_id FROM user_company_roles ucr
      WHERE ucr.user_id = (SELECT auth.uid()) AND ucr.is_active = true
    )
  )
);

DROP POLICY IF EXISTS "Equipment documents access policy" ON public.equipment_documents;
CREATE POLICY "Equipment documents access policy" ON public.equipment_documents
FOR ALL TO authenticated
USING (
  public.is_authenticated_non_anon() AND 
  equipment_id IN (
    SELECT ce.id FROM company_equipment ce
    WHERE ce.company_id IN (
      SELECT ucr.company_id FROM user_company_roles ucr
      WHERE ucr.user_id = (SELECT auth.uid()) AND ucr.is_active = true
    )
  )
)
WITH CHECK (
  public.is_authenticated_non_anon() AND 
  equipment_id IN (
    SELECT ce.id FROM company_equipment ce
    WHERE ce.company_id IN (
      SELECT ucr.company_id FROM user_company_roles ucr
      WHERE ucr.user_id = (SELECT auth.uid()) AND ucr.is_active = true
    )
  )
);

DROP POLICY IF EXISTS "Equipment locations company access" ON public.equipment_locations;
CREATE POLICY "Equipment locations company access" ON public.equipment_locations
FOR ALL TO authenticated
USING (
  public.is_authenticated_non_anon() AND 
  equipment_id IN (
    SELECT ce.id FROM company_equipment ce
    WHERE ce.company_id IN (
      SELECT ucr.company_id FROM user_company_roles ucr
      WHERE ucr.user_id = (SELECT auth.uid()) AND ucr.is_active = true
    )
  )
)
WITH CHECK (
  public.is_authenticated_non_anon() AND 
  equipment_id IN (
    SELECT ce.id FROM company_equipment ce
    WHERE ce.company_id IN (
      SELECT ucr.company_id FROM user_company_roles ucr
      WHERE ucr.user_id = (SELECT auth.uid()) AND ucr.is_active = true
    )
  )
);