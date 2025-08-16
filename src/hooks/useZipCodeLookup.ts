import { useState } from 'react';
import { useDebounce } from 'use-debounce';

interface ZipCodeData {
  city: string;
  state: string;
  stateId: string;
}

export function useZipCodeLookup() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
          setError('ZIP code no encontrado');
        } else {
          setError('Error al buscar ZIP code');
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
      setError('Error de conexión');
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