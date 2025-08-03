-- Agregar campo para endosos adicionales del conductor
ALTER TABLE public.driver_profiles 
ADD COLUMN cdl_endorsements TEXT DEFAULT '';

COMMENT ON COLUMN public.driver_profiles.cdl_endorsements IS 'Endosos adicionales de CDL: T=Doble/triple remolque, P=Transporte de pasajeros, S=Autobuses escolares, N=Vehículos cisterna, H=Materiales peligrosos, X=Hazmat + cisterna combinados';