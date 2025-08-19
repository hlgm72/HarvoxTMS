-- Clean up duplicate and old policies for load documents
DO $$
BEGIN
  -- Remove old duplicate policies
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Load documents - SELECT access' AND schemaname = 'storage') THEN
    DROP POLICY "Load documents - SELECT access" ON storage.objects;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Load documents - INSERT access' AND schemaname = 'storage') THEN
    DROP POLICY "Load documents - INSERT access" ON storage.objects;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Load documents - UPDATE access' AND schemaname = 'storage') THEN
    DROP POLICY "Load documents - UPDATE access" ON storage.objects;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Load documents - DELETE access' AND schemaname = 'storage') THEN
    DROP POLICY "Load documents - DELETE access" ON storage.objects;
  END IF;
  
  -- Remove other duplicate policies
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Load documents view access' AND schemaname = 'storage') THEN
    DROP POLICY "Load documents view access" ON storage.objects;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Load documents update access' AND schemaname = 'storage') THEN
    DROP POLICY "Load documents update access" ON storage.objects;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Load documents delete access' AND schemaname = 'storage') THEN
    DROP POLICY "Load documents delete access" ON storage.objects;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can upload files for their loads' AND schemaname = 'storage') THEN
    DROP POLICY "Users can upload files for their loads" ON storage.objects;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Load documents upload access' AND schemaname = 'storage') THEN
    DROP POLICY "Load documents upload access" ON storage.objects;
  END IF;
END $$;