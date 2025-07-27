-- Verificar y optimizar las políticas RLS de loads
-- Primero verificar si la política existe
DO $$
BEGIN
    -- Eliminar políticas existentes de loads si existen
    DROP POLICY IF EXISTS "Loads comprehensive access policy" ON loads;
    DROP POLICY IF EXISTS "Company loads access" ON loads;
    DROP POLICY IF EXISTS "Loads access for company drivers" ON loads;
    
    -- Crear nueva política optimizada para loads
    CREATE POLICY "Loads company access policy" 
    ON loads 
    FOR ALL 
    USING (
      (SELECT auth.uid()) IS NOT NULL 
      AND ((SELECT auth.jwt())->>'is_anonymous')::boolean IS FALSE 
      AND (
        driver_user_id = (SELECT auth.uid())
        OR driver_user_id IN (
          SELECT ucr.user_id
          FROM user_company_roles ucr
          WHERE ucr.company_id IN (
            SELECT ucr2.company_id
            FROM user_company_roles ucr2
            WHERE ucr2.user_id = (SELECT auth.uid()) 
            AND ucr2.is_active = true
          )
          AND ucr.is_active = true
        )
        OR (driver_user_id IS NULL AND created_by = (SELECT auth.uid()))
      )
    )
    WITH CHECK (
      (SELECT auth.uid()) IS NOT NULL 
      AND ((SELECT auth.jwt())->>'is_anonymous')::boolean IS FALSE 
      AND (
        driver_user_id IN (
          SELECT ucr.user_id
          FROM user_company_roles ucr
          WHERE ucr.company_id IN (
            SELECT ucr2.company_id
            FROM user_company_roles ucr2
            WHERE ucr2.user_id = (SELECT auth.uid()) 
            AND ucr2.is_active = true
          )
          AND ucr.is_active = true
        )
        OR (driver_user_id IS NULL AND created_by = (SELECT auth.uid()))
      )
    );
END $$;