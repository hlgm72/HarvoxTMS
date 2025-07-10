-- Cambiar el plan_type de FleetNest Demo Transport a 'demo' para permitir su eliminación
UPDATE public.companies 
SET plan_type = 'demo' 
WHERE id = '102251da-f717-4827-9320-d1bc7b769756' AND name = 'FleetNest Demo Transport';