-- Add driver_id field to driver_profiles table
-- This field will store the internal company-assigned driver number/code
ALTER TABLE public.driver_profiles 
ADD COLUMN driver_id TEXT;

-- Add a comment to clarify the purpose of this field
COMMENT ON COLUMN public.driver_profiles.driver_id IS 'Internal driver number/code assigned by the company for both company drivers and owner-operators';

-- Create an index for better performance when searching by driver_id
CREATE INDEX idx_driver_profiles_driver_id ON public.driver_profiles(driver_id);

-- Add a unique constraint per company (we'll need to modify this when we add company relationship)
-- For now, we'll make it unique globally, but this can be adjusted later when we implement the company relationship
CREATE UNIQUE INDEX idx_driver_profiles_driver_id_unique ON public.driver_profiles(driver_id) WHERE driver_id IS NOT NULL;