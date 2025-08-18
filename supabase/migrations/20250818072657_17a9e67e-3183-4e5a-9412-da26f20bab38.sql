-- Reset load 25-384 status to assigned
UPDATE loads 
SET status = 'assigned' 
WHERE load_number = '25-384';