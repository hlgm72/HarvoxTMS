-- Delete the duplicated recurring expenses again
DELETE FROM expense_instances 
WHERE id IN (
  'd0fd2870-0355-4570-9bb9-b3c9b6b033b5',  -- Truckstop.com 
  'b4b934f6-ddae-4fee-a6b9-df081a1026b9',  -- PrePass  
  '66bd595d-3bd1-40a5-ad12-6233faee2e96'   -- Geotab ELD 
);