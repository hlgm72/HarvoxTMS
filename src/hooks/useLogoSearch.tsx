import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface LogoSearchResult {
  success: boolean;
  logoUrl?: string;
  source?: 'clearbit' | 'google' | 'iconhorse' | 'website' | 'logosearch';
  error?: string;
}

export function useLogoSearch() {
  const [isSearching, setIsSearching] = useState(false);

  const searchLogo = async (companyName: string, emailDomain?: string, sourceIndex?: number): Promise<LogoSearchResult> => {
    setIsSearching(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('search-company-logo', {
        body: {
          companyName,
          emailDomain,
          sourceIndex: sourceIndex || 0,
        },
      });

      if (error) {
        console.error('Edge function error:', error);
        return {
          success: false,
          error: 'Failed to search for logo',
        };
      }

      return data as LogoSearchResult;
    } catch (error) {
      console.error('Logo search error:', error);
      return {
        success: false,
        error: 'Failed to search for logo',
      };
    } finally {
      setIsSearching(false);
    }
  };

  return {
    searchLogo,
    isSearching,
  };
}