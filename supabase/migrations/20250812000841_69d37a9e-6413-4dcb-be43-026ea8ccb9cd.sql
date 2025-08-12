-- Fix existing loads for Diosvani where percentages are 0 but should be null
-- This allows them to inherit owner-operator percentages when edited

UPDATE loads 
SET 
  factoring_percentage = NULL,
  dispatching_percentage = NULL,
  leasing_percentage = NULL
WHERE driver_user_id = '484d83b3-b928-46b3-9705-db225ddb9b0c' -- Diosvani's user_id
  AND (factoring_percentage = 0 OR dispatching_percentage = 0 OR leasing_percentage = 0);