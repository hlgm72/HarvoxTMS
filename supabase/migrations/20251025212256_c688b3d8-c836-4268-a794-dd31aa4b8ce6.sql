-- Migrar datos de load_stops a facilities
-- Paso 1: Insertar facilities únicas desde load_stops
WITH unique_facilities AS (
  SELECT 
    ucr.company_id,
    ls.company_name,
    ls.address,
    ls.city,
    ls.state,
    ls.zip_code,
    array_agg(DISTINCT ls.stop_type) as stop_types,
    MAX(ls.contact_name) as contact_name,
    MAX(ls.contact_phone) as contact_phone,
    (array_agg(l.created_by ORDER BY l.created_at))[1] as created_by,
    MIN(l.created_at) as first_seen
  FROM load_stops ls
  JOIN loads l ON ls.load_id = l.id
  JOIN user_company_roles ucr ON l.driver_user_id = ucr.user_id 
  WHERE ucr.is_active = true
    AND ls.company_name IS NOT NULL 
    AND TRIM(ls.company_name) != ''
    AND ls.address IS NOT NULL
    AND ls.city IS NOT NULL
    AND ls.state IS NOT NULL
    AND ls.zip_code IS NOT NULL
  GROUP BY 
    ucr.company_id, 
    ls.company_name, 
    ls.address, 
    ls.city, 
    ls.state, 
    ls.zip_code
)
INSERT INTO public.facilities (
  company_id, 
  name, 
  facility_type, 
  address, 
  city, 
  state, 
  zip_code, 
  contact_name, 
  contact_phone, 
  created_by,
  created_at
)
SELECT 
  company_id,
  company_name as name,
  CASE 
    WHEN 'pickup' = ANY(stop_types) AND 'delivery' = ANY(stop_types) THEN 'both'
    WHEN 'pickup' = ANY(stop_types) THEN 'shipper'
    WHEN 'delivery' = ANY(stop_types) THEN 'receiver'
    ELSE 'both'
  END as facility_type,
  address,
  city,
  state,
  zip_code,
  contact_name,
  contact_phone,
  created_by,
  first_seen as created_at
FROM unique_facilities
ON CONFLICT DO NOTHING;

-- Paso 2: Actualizar load_stops con facility_id correspondiente
UPDATE load_stops 
SET facility_id = subquery.facility_id
FROM (
  SELECT 
    ls.id as load_stop_id,
    f.id as facility_id
  FROM load_stops ls
  JOIN loads l ON ls.load_id = l.id
  JOIN user_company_roles ucr ON l.driver_user_id = ucr.user_id AND ucr.is_active = true
  JOIN facilities f ON 
    f.company_id = ucr.company_id
    AND f.name = ls.company_name
    AND f.address = ls.address
    AND f.city = ls.city
    AND f.state = ls.state
    AND f.zip_code = ls.zip_code
  WHERE ls.company_name IS NOT NULL
) subquery
WHERE load_stops.id = subquery.load_stop_id;