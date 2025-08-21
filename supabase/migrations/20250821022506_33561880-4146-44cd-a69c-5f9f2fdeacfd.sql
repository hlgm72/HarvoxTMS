-- Delete the incorrectly applied recurring expenses for Diosvani in the August 11-17 period
DELETE FROM expense_instances 
WHERE id IN (
  'aff8d648-88b9-4d0a-aeee-12dbd26394e7',  -- Truckstop.com duplicate
  'b343239a-e449-4a48-b532-a56d0c1f19be',  -- PrePass duplicate  
  'b2d59657-ef53-46f2-9794-f74c815ec953'   -- Geotab ELD duplicate
);