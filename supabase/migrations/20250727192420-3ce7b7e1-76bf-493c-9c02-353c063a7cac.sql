-- Remove duplicate payment_reports policy to fix multiple permissive policies warning

-- Drop the old policy that's causing the conflict
DROP POLICY IF EXISTS "Users can view payment reports for their company periods" ON public.payment_reports;

-- The "Payment reports comprehensive policy" should remain as the single policy for all operations