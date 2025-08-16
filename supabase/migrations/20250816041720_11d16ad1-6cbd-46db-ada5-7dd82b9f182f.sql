-- Corregir cargas existentes que tienen conductor asignado pero están en estado 'created'
-- Estas deberían estar en estado 'assigned'

UPDATE public.loads 
SET status = 'assigned', updated_at = now()
WHERE status = 'created' 
  AND driver_user_id IS NOT NULL;

-- También corregir cargas que no tienen conductor pero están en estado 'assigned'  
-- Estas deberían estar en estado 'created'
UPDATE public.loads 
SET status = 'created', updated_at = now()
WHERE status = 'assigned' 
  AND driver_user_id IS NULL;