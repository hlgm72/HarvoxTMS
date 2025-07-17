-- Forzar eliminación completa y recreación de vistas sin SECURITY DEFINER

-- Eliminar completamente las vistas problemáticas
DROP VIEW IF EXISTS public.equipment_with_document_status CASCADE;
DROP VIEW IF EXISTS public.loads_with_calculated_dates CASCADE;

-- Recrear equipment_with_document_status como vista normal (sin SECURITY DEFINER)
CREATE VIEW public.equipment_with_document_status AS
SELECT 
  ce.id,
  ce.equipment_number,
  ce.equipment_type,
  ce.make,
  ce.model,
  ce.year,
  ce.vin_number,
  ce.license_plate,
  ce.status,
  ce.fuel_type,
  ce.notes,
  ce.company_id,
  ce.geotab_vehicle_id,
  ce.created_at,
  ce.updated_at,
  ce.license_plate_expiry_date,
  ce.annual_inspection_expiry_date,
  ce.purchase_date,
  ce.purchase_price,
  ce.current_mileage,
  ce.insurance_expiry_date,
  ce.registration_expiry_date,
  ce.created_by,
  ce.updated_by,
  COALESCE(doc_counts.has_title, 0) as has_title,
  COALESCE(doc_counts.has_registration, 0) as has_registration,
  COALESCE(doc_counts.has_inspection, 0) as has_inspection,
  COALESCE(doc_counts.has_form_2290, 0) as has_form_2290,
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
LEFT JOIN (
  SELECT 
    equipment_id,
    SUM(CASE WHEN document_type = 'title' AND is_current = true THEN 1 ELSE 0 END) as has_title,
    SUM(CASE WHEN document_type = 'registration' AND is_current = true THEN 1 ELSE 0 END) as has_registration,
    SUM(CASE WHEN document_type = 'inspection' AND is_current = true THEN 1 ELSE 0 END) as has_inspection,
    SUM(CASE WHEN document_type = 'form_2290' AND is_current = true THEN 1 ELSE 0 END) as has_form_2290
  FROM public.equipment_documents
  GROUP BY equipment_id
) doc_counts ON ce.id = doc_counts.equipment_id;

-- Recrear loads_with_calculated_dates como vista normal (sin SECURITY DEFINER)
CREATE VIEW public.loads_with_calculated_dates AS
SELECT 
  l.id,
  l.load_number,
  l.commodity,
  l.status,
  l.currency,
  l.customer_name,
  l.notes,
  l.driver_user_id,
  l.total_amount,
  l.factoring_percentage,
  l.dispatching_percentage,
  l.leasing_percentage,
  l.broker_id,
  l.weight_lbs,
  l.created_at,
  l.updated_at,
  l.created_by,
  l.payment_period_id,
  pickup_stops.scheduled_date as calculated_pickup_date,
  pickup_stops.actual_date as actual_pickup_date,
  delivery_stops.scheduled_date as calculated_delivery_date,
  delivery_stops.actual_date as actual_delivery_date
FROM public.loads l
LEFT JOIN (
  SELECT DISTINCT ON (load_id) 
    load_id, 
    scheduled_date, 
    actual_date
  FROM public.load_stops 
  WHERE stop_type = 'pickup'
  ORDER BY load_id, stop_number ASC
) pickup_stops ON l.id = pickup_stops.load_id
LEFT JOIN (
  SELECT DISTINCT ON (load_id) 
    load_id, 
    scheduled_date, 
    actual_date
  FROM public.load_stops 
  WHERE stop_type = 'delivery'
  ORDER BY load_id, stop_number DESC
) delivery_stops ON l.id = delivery_stops.load_id;