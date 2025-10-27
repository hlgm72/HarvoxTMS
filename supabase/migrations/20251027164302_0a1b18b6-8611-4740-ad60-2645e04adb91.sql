-- Convert all existing commodity values to uppercase
UPDATE loads 
SET commodity = UPPER(commodity) 
WHERE commodity IS NOT NULL AND commodity != UPPER(commodity);