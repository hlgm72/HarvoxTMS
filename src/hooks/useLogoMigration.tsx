import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface MigrationResult {
  total: number;
  migrated: number;
  failed: number;
  errors: string[];
}

interface MigrationResponse {
  success: boolean;
  message: string;
  results: MigrationResult;
  error?: string;
}

export function useLogoMigration() {
  const [isMigrating, setIsMigrating] = useState(false);
  const [result, setResult] = useState<MigrationResponse | null>(null);

  const migrateClearbitLogos = async (): Promise<MigrationResponse> => {
    setIsMigrating(true);
    setResult(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('migrate-logos-to-storage');

      if (error) {
        console.error('Edge function error:', error);
        const errorResult: MigrationResponse = {
          success: false,
          message: 'Error ejecutando la migración',
          results: { total: 0, migrated: 0, failed: 0, errors: [error.message] },
          error: error.message
        };
        setResult(errorResult);
        return errorResult;
      }

      const migrationResult = data as MigrationResponse;
      setResult(migrationResult);
      return migrationResult;
      
    } catch (error) {
      console.error('Migration error:', error);
      const errorResult: MigrationResponse = {
        success: false,
        message: 'Error ejecutando la migración',
        results: { total: 0, migrated: 0, failed: 0, errors: [String(error)] },
        error: String(error)
      };
      setResult(errorResult);
      return errorResult;
    } finally {
      setIsMigrating(false);
    }
  };

  return {
    migrateClearbitLogos,
    isMigrating,
    result,
    clearResult: () => setResult(null)
  };
}