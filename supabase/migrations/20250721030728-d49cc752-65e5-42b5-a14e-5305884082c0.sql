-- Make driver_user_id nullable to allow loads without assigned drivers
ALTER TABLE public.loads 
ALTER COLUMN driver_user_id DROP NOT NULL;