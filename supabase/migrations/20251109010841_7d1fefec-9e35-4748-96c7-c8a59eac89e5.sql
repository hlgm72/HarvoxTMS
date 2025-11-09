-- Update FleetNest Demo Transport to Harvox Demo Transport
UPDATE public.companies 
SET 
  name = 'Harvox Demo Transport',
  email = 'demo@harvox.app'
WHERE id = '102251da-f717-4827-9320-d1bc7b769756' 
  AND name = 'FleetNest Demo Transport';