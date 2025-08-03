-- Fix remaining unindexed foreign key
-- Create index for broker_dispatcher_id only if the column exists

DO $$
BEGIN
    -- Check if broker_dispatcher_id column exists and create index
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'loads' 
               AND column_name = 'broker_dispatcher_id' 
               AND table_schema = 'public') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_loads_broker_dispatcher_id ON public.loads(broker_dispatcher_id)';
    END IF;
END
$$;