-- Assign the correct period manually to the recent load
UPDATE public.loads 
SET payment_period_id = '6109b35c-ca0e-4eff-9655-ddc614818ab5'
WHERE load_number = '25-375';