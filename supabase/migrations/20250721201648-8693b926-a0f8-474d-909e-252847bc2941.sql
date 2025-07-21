-- COMPLETELY disable RLS to isolate the issue
ALTER TABLE public.load_stops DISABLE ROW LEVEL SECURITY;

-- Drop all policies
DROP POLICY IF EXISTS "Load stops basic access" ON public.load_stops;

-- Also disable any triggers that might exist but aren't showing up
-- Check if the trigger exists and drop it
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_handle_load_stops_company_assignment') THEN
        DROP TRIGGER trigger_handle_load_stops_company_assignment ON public.load_stops;
    END IF;
END $$;

-- Check for other possible trigger names
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid = 'public.load_stops'::regclass) THEN
        -- Drop all triggers on load_stops
        DECLARE
            trigger_record RECORD;
        BEGIN
            FOR trigger_record IN 
                SELECT tgname FROM pg_trigger WHERE tgrelid = 'public.load_stops'::regclass
            LOOP
                EXECUTE 'DROP TRIGGER ' || trigger_record.tgname || ' ON public.load_stops';
            END LOOP;
        END;
    END IF;
END $$;