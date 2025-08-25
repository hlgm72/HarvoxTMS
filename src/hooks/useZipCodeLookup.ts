import { useState } from 'react';
import { useDebounce } from 'use-debounce';
import { useTranslation } from 'react-i18next';

interface ZipCodeData {
  city: string;
  state: string;
  stateId: string;
}

export function useZipCodeLookup() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { t, i18n } = useTranslation('common');
  
  console.log('useZipCodeLookup - Current language:', i18n.language);

  const lookupZipCode = async (zipCode: string): Promise<ZipCodeData | null> => {
    if (!zipCode || zipCode.length !== 5) {
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Using ZipCode API (free tier: 1000 requests/month)
      const response = await fetch(`https://api.zippopotam.us/us/${zipCode}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          const errorMsg = t('address.zip_code_not_found', 'ZIP code not found');
          console.log('ZIP code not found - key:', 'address.zip_code_not_found', 'translation:', errorMsg, 'language:', i18n.language);
          setError(errorMsg);
        } else {
          const errorMsg = t('address.zip_code_lookup_error', 'Error looking up ZIP code');
          console.log('ZIP code lookup error - key:', 'address.zip_code_lookup_error', 'translation:', errorMsg, 'language:', i18n.language);
          setError(errorMsg);
        }
        return null;
      }

      const data = await response.json();
      
      if (data.places && data.places.length > 0) {
        const place = data.places[0];
        return {
          city: place['place name'],
          state: place.state,
          stateId: place['state abbreviation']
        };
      }

      return null;
    } catch (err) {
      const errorMsg = t('address.zip_code_connection_error', 'Connection error');
      console.log('ZIP code connection error - key:', 'address.zip_code_connection_error', 'translation:', errorMsg, 'language:', i18n.language);
      setError(errorMsg);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    lookupZipCode,
    isLoading,
    error
  };
}