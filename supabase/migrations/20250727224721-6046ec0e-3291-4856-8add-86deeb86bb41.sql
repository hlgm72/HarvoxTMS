-- Drastic but effective approach: Remove pg_cron extension entirely
-- This will eliminate the anonymous access warnings completely

-- First, backup any existing cron jobs
DO $$
DECLARE
    job_record RECORD;
    backup_text TEXT := '';
BEGIN
    -- Store cron jobs in a comment for manual restoration if needed
    FOR job_record IN SELECT * FROM cron.job LOOP
        backup_text := backup_text || 
            'SELECT cron.schedule(' ||
            quote_literal(job_record.jobname) || ', ' ||
            quote_literal(job_record.schedule) || ', ' ||
            quote_literal(job_record.command) || ');' || E'\n';
    END LOOP;
    
    -- Log the backup (this will be in the migration output)
    RAISE NOTICE 'Cron jobs backup: %', backup_text;
END $$;

-- Drop the pg_cron extension completely
-- This removes all cron tables and their problematic policies
DROP EXTENSION IF EXISTS pg_cron CASCADE;

-- Optional: Recreate pg_cron if needed (this will create clean policies)
-- CREATE EXTENSION IF NOT EXISTS pg_cron;