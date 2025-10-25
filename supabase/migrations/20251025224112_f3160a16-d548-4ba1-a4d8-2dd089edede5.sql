-- Remove facility_type column from facilities table
ALTER TABLE public.facilities DROP COLUMN IF EXISTS facility_type;