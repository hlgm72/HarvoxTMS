import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface LogoSearchResult {
  success: boolean;
  logoUrl?: string;
  source?: 'clearbit' | 'google' | 'iconhorse' | 'website' | 'logosearch';
  error?: string;
}

interface DownloadResult {
  success: boolean;
  logoUrl?: string;
  error?: string;
}

export function useLogoSearch() {
  const [isSearching, setIsSearching] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

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

  const downloadLogo = async (imageUrl: string, clientId: string, companyName: string): Promise<DownloadResult> => {
    setIsDownloading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('download-client-logo', {
        body: {
          imageUrl,
          clientId,
          companyName,
        },
      });

      if (error) {
        console.error('Edge function error:', error);
        return {
          success: false,
          error: 'Failed to download logo',
        };
      }

      return data as DownloadResult;
    } catch (error) {
      console.error('Logo download error:', error);
      return {
        success: false,
        error: 'Failed to download logo',
      };
    } finally {
      setIsDownloading(false);
    }
  };

  return {
    searchLogo,
    downloadLogo,
    isSearching,
    isDownloading,
  };
}