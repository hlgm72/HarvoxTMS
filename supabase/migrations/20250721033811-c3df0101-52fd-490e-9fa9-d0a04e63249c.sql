-- Force update with the specific ID
UPDATE public.loads 
SET payment_period_id = '6109b35c-ca0e-4eff-9655-ddc614818ab5'
WHERE id = 'd8d403fd-7bc4-43c4-af1f-1ade395184f6';

-- Also create a batch update for any other loads that might be missing periods
UPDATE public.loads 
SET payment_period_id = '6109b35c-ca0e-4eff-9655-ddc614818ab5'
WHERE pickup_date = '2025-07-14'
AND payment_period_id IS NULL
AND created_by = '087a825c-94ea-42d9-8388-5087a19d776f';