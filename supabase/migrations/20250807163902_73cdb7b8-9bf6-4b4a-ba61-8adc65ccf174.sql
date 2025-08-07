-- Restaurar URLs a Clearbit para poder re-migrar con la nueva estructura
UPDATE company_clients 
SET logo_url = 'https://logo.clearbit.com/' || 
  CASE 
    WHEN name LIKE '%DOUBLE SHIELD%' THEN 'doubleshieldlogistics.com'
    WHEN name LIKE '%FREIGHTSAVER%' THEN 'freightsaver.com'
    WHEN name LIKE '%JONES TRANSPORT%' THEN 'jonestransport.com'
    WHEN name LIKE '%PROJECT FREIGHT%' THEN 'pftransportation.com'
    WHEN name LIKE '%BEEMAC%' THEN 'beemac.com'
    WHEN name LIKE '%TRANSPORTATION%' THEN LOWER(REPLACE(REPLACE(name, ' ', ''), 'INC', '')) || '.com'
    WHEN name LIKE '%LOGISTICS%' THEN LOWER(REPLACE(REPLACE(name, ' ', ''), 'INC', '')) || '.com'
    WHEN name LIKE '%TRUCKING%' THEN LOWER(REPLACE(REPLACE(name, ' ', ''), 'INC', '')) || '.com'
    ELSE LOWER(REPLACE(REPLACE(REPLACE(name, ' ', ''), 'INC', ''), 'LLC', '')) || '.com'
  END
WHERE logo_url LIKE '%/storage/v1/object/public/client-logos/%';