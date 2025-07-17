-- Arreglar errores de seguridad - Eliminar SECURITY DEFINER de vistas

-- Recrear vista equipment_with_document_status sin SECURITY DEFINER
DROP VIEW IF EXISTS public.equipment_with_document_status CASCADE;

CREATE VIEW public.equipment_with_document_status AS
SELECT 
  ce.*,
  CASE 
    WHEN COUNT(CASE WHEN ed.document_type = 'title' THEN 1 END) > 0 THEN 1 
    ELSE 0 
  END as has_title,
  CASE 
    WHEN COUNT(CASE WHEN ed.document_type = 'registration' THEN 1 END) > 0 THEN 1 
    ELSE 0 
  END as has_registration,
  CASE 
    WHEN COUNT(CASE WHEN ed.document_type = 'inspection' THEN 1 END) > 0 THEN 1 
    ELSE 0 
  END as has_inspection,
  CASE 
    WHEN COUNT(CASE WHEN ed.document_type = 'form_2290' THEN 1 END) > 0 THEN 1 
    ELSE 0 
  END as has_form_2290,
  CASE 
    WHEN ce.registration_expiry_date < CURRENT_DATE THEN 'expired'
    WHEN ce.registration_expiry_date < CURRENT_DATE + INTERVAL '30 days' THEN 'expiring_soon'
    ELSE 'valid'
  END as registration_status,
  CASE 
    WHEN ce.license_plate_expiry_date < CURRENT_DATE THEN 'expired'
    WHEN ce.license_plate_expiry_date < CURRENT_DATE + INTERVAL '30 days' THEN 'expiring_soon'
    ELSE 'valid'
  END as license_status,
  CASE 
    WHEN ce.annual_inspection_expiry_date < CURRENT_DATE THEN 'expired'
    WHEN ce.annual_inspection_expiry_date < CURRENT_DATE + INTERVAL '30 days' THEN 'expiring_soon'
    ELSE 'valid'
  END as inspection_status
FROM public.company_equipment ce
LEFT JOIN public.equipment_documents ed ON ce.id = ed.equipment_id AND ed.is_current = true
GROUP BY ce.id, ce.equipment_number, ce.equipment_type, ce.make, ce.model, ce.year, 
         ce.vin_number, ce.license_plate, ce.status, ce.fuel_type, ce.notes, 
         ce.company_id, ce.geotab_vehicle_id, ce.created_at, ce.updated_at,
         ce.license_plate_expiry_date, ce.annual_inspection_expiry_date,
         ce.purchase_date, ce.purchase_price, ce.current_mileage, 
         ce.insurance_expiry_date, ce.registration_expiry_date,
         ce.created_by, ce.updated_by;

-- Recrear vista loads_with_calculated_dates sin SECURITY DEFINER
DROP VIEW IF EXISTS public.loads_with_calculated_dates CASCADE;

CREATE VIEW public.loads_with_calculated_dates AS
SELECT 
  l.*,
  -- Obtener primera fecha de pickup
  pickup_stops.scheduled_date as calculated_pickup_date,
  pickup_stops.actual_date as actual_pickup_date,
  -- Obtener última fecha de delivery  
  delivery_stops.scheduled_date as calculated_delivery_date,
  delivery_stops.actual_date as actual_delivery_date
FROM public.loads l
LEFT JOIN (
  SELECT DISTINCT ON (load_id) 
    load_id, scheduled_date, actual_date
  FROM public.load_stops 
  WHERE stop_type = 'pickup'
  ORDER BY load_id, stop_number ASC
) pickup_stops ON l.id = pickup_stops.load_id
LEFT JOIN (
  SELECT DISTINCT ON (load_id) 
    load_id, scheduled_date, actual_date
  FROM public.load_stops 
  WHERE stop_type = 'delivery'
  ORDER BY load_id, stop_number DESC
) delivery_stops ON l.id = delivery_stops.load_id;