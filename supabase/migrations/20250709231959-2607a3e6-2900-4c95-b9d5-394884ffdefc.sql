-- Add financial fields to owner_operators table
ALTER TABLE public.owner_operators 
ADD COLUMN insurance_pay DECIMAL(10,2),
ADD COLUMN factoring_percentage DECIMAL(5,2),
ADD COLUMN dispatching_percentage DECIMAL(5,2),
ADD COLUMN leasing_percentage DECIMAL(5,2);