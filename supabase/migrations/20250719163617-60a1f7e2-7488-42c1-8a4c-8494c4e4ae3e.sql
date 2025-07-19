
-- Add broker_dispatcher_id column to loads table to store the selected broker dispatcher
ALTER TABLE public.loads 
ADD COLUMN broker_dispatcher_id UUID REFERENCES public.company_broker_dispatchers(id);

-- Add comment to clarify the purpose of this field
COMMENT ON COLUMN public.loads.broker_dispatcher_id IS 'References the specific dispatcher from the broker company who is handling this load';

-- Create an index for better performance when querying by broker dispatcher
CREATE INDEX idx_loads_broker_dispatcher_id ON public.loads(broker_dispatcher_id);
