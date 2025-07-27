-- Add only missing INSERT policies that don't exist yet

-- Check and add missing INSERT policy for maintenance_types (only if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'maintenance_types' 
        AND policyname = 'Service role can insert maintenance types'
    ) THEN
        CREATE POLICY "Service role can insert maintenance types" ON public.maintenance_types
        FOR INSERT 
        TO service_role
        WITH CHECK (true);
    END IF;
END $$;

-- Check and add missing INSERT policy for fuel_card_providers (only if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'fuel_card_providers' 
        AND policyname = 'Company managers can insert fuel card providers'
    ) THEN
        CREATE POLICY "Company managers can insert fuel card providers" ON public.fuel_card_providers
        FOR INSERT 
        TO authenticated
        WITH CHECK (
          require_authenticated_user() AND
          EXISTS (
            SELECT 1 FROM user_company_roles ucr
            WHERE ucr.user_id = auth.uid()
            AND ucr.role = ANY (ARRAY['company_owner'::user_role, 'operations_manager'::user_role, 'superadmin'::user_role])
            AND ucr.is_active = true
          )
        );
    END IF;
END $$;

-- Check and add missing INSERT policy for driver_fuel_cards (only if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'driver_fuel_cards' 
        AND policyname = 'Driver cards company insert policy'
    ) THEN
        CREATE POLICY "Driver cards company insert policy" ON public.driver_fuel_cards
        FOR INSERT 
        TO authenticated
        WITH CHECK (
          require_authenticated_user() AND
          EXISTS (
            SELECT 1 FROM user_company_roles ucr
            WHERE ucr.user_id = auth.uid()
            AND ucr.company_id = driver_fuel_cards.company_id
            AND ucr.role = ANY (ARRAY['company_owner'::user_role, 'operations_manager'::user_role])
            AND ucr.is_active = true
          )
        );
    END IF;
END $$;