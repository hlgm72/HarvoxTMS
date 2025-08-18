-- Temporarily disable the trigger, update the load, then re-enable
ALTER TABLE public.loads DISABLE TRIGGER log_load_status_change_trigger;

-- Reset load 25-384 status to assigned
UPDATE loads 
SET status = 'assigned' 
WHERE load_number = '25-384';

-- Re-enable the trigger
ALTER TABLE public.loads ENABLE TRIGGER log_load_status_change_trigger;