-- Add missing updated_by column to loads table for proper audit trail
ALTER TABLE loads ADD COLUMN updated_by UUID REFERENCES auth.users(id);

-- Set updated_by to created_by for existing records where we know who created them
UPDATE loads SET updated_by = created_by WHERE created_by IS NOT NULL;