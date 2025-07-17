-- Solución definitiva: Cambiar las vistas a SECURITY INVOKER
-- Esto hace que las vistas usen los permisos del usuario que las consulta, no del creador

ALTER VIEW public.load_details_with_dates 
SET (security_invoker = true);

ALTER VIEW public.equipment_status_summary 
SET (security_invoker = true);