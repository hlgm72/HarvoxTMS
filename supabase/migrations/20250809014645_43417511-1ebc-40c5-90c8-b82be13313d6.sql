-- Add missing columns to user_invitations table
ALTER TABLE public.user_invitations 
ADD COLUMN IF NOT EXISTS first_name TEXT,
ADD COLUMN IF NOT EXISTS last_name TEXT,
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending';

-- Update existing records to have pending status if null
UPDATE public.user_invitations 
SET status = 'pending' 
WHERE status IS NULL;