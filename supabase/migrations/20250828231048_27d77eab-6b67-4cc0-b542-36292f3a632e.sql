-- Actualizar las cargas de Héctor González de la semana 34 
-- de "created" a "delivered" para que aparezcan en los reportes de pago

UPDATE public.loads 
SET 
  status = 'delivered',
  updated_at = now()
WHERE driver_user_id = '484d83b3-b928-46b3-9705-db225ddb9b0c'
  AND delivery_date >= '2025-08-18' 
  AND delivery_date <= '2025-08-24'
  AND status = 'created'
  AND id IN ('c41e6977-2b00-4d3e-97c8-6c67126863d1', 'd7c0c403-e7f7-4ff9-a4d7-1cad775392fa');

-- Registrar los cambios en el historial de estados usando un UUID del sistema
INSERT INTO load_status_history (
  load_id,
  previous_status,
  new_status,
  changed_by,
  changed_at,
  notes
) VALUES 
  ('c41e6977-2b00-4d3e-97c8-6c67126863d1', 'created', 'delivered', '00000000-0000-0000-0000-000000000000', now(), 'Marcado como delivered manualmente para reportes de pago - Load 25-412'),
  ('d7c0c403-e7f7-4ff9-a4d7-1cad775392fa', 'created', 'delivered', '00000000-0000-0000-0000-000000000000', now(), 'Marcado como delivered manualmente para reportes de pago - Load 25-415');