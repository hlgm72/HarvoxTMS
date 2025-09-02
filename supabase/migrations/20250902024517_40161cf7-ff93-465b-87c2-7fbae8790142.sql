-- Remove the incorrectly added updated_by column from loads table
ALTER TABLE loads DROP COLUMN updated_by;