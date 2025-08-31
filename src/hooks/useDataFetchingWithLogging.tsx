/**
 * EJEMPLO: Hook personalizado que demuestra logging en operaciones de datos
 * Muestra cómo loggear sin crear spam en Sentry
 */

import { useState, useEffect } from 'react';
import { useLogger, business, performance, handleAsyncError } from '@/lib/logger';

interface ApiResponse<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

interface FetchOptions {
  enableLogging?: boolean;
  retryAttempts?: number;
  cacheTime?: number;
}

/**
 * Hook genérico para fetch con logging inteligente
 */
export function useDataFetchingWithLogging<T>(
  url: string,
  options: FetchOptions = {}
): ApiResponse<T> {
  const log = useLogger('useDataFetchingWithLogging');
  const { enableLogging = true, retryAttempts = 3, cacheTime = 5 * 60 * 1000 } = options;
  
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [lastFetchTime, setLastFetchTime] = useState<number>(0);

  const fetchData = async (isRetry = false) => {
    // Verificar cache antes de hacer request
    const now = Date.now();
    const isCacheValid = (now - lastFetchTime) < cacheTime;
    
    if (data && isCacheValid && !isRetry) {
      if (enableLogging) {
        log.debug('Using cached data', { 
          url: url.replace(/\/api\//, '/****/'), // Ocultar parte de la URL por seguridad
          cacheAge: now - lastFetchTime,
          cacheTime
        });
      }
      setLoading(false);
      return;
    }

    const timer = performance.start(`api_fetch_${url.split('/').pop()}`);
    
    try {
      if (enableLogging) {
        log.debug('Starting API fetch', { 
          url: url.replace(/\/api\//, '/****/'),
          isRetry,
          retryCount: isRetry ? retryCount + 1 : 0
        });
      }

      setLoading(true);
      setError(null);

      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      setData(result);
      setLastFetchTime(now);
      setRetryCount(0); // Reset retry count on success

      if (enableLogging) {
        log.info('API fetch successful', { 
          url: url.replace(/\/api\//, '/****/'),
          dataSize: JSON.stringify(result).length,
          retryWasNeeded: isRetry
        });

        // Log de negocio para analytics importantes
        if (url.includes('/payments') || url.includes('/periods')) {
          business.payment('data_fetched', {
            endpoint: url.split('/').pop(),
            dataSize: JSON.stringify(result).length,
            hadRetry: isRetry
          });
        }
      }

    } catch (fetchError) {
      const currentRetry = isRetry ? retryCount + 1 : 0;
      
      if (currentRetry < retryAttempts) {
        // Log WARN para retries - va a Sentry pero no es crítico aún
        if (enableLogging) {
          log.warn(`Fetch failed, retrying (${currentRetry + 1}/${retryAttempts})`, { 
            url: url.replace(/\/api\//, '/****/'),
            error: fetchError instanceof Error ? fetchError.message : String(fetchError),
            retryCount: currentRetry + 1
          });
        }

        setRetryCount(currentRetry + 1);
        
        // Retry con backoff exponencial
        const retryDelay = Math.pow(2, currentRetry) * 1000; // 1s, 2s, 4s...
        setTimeout(() => fetchData(true), retryDelay);
        
        return;
      }

      // Todos los retries fallaron - LOG ERROR crítico va a Sentry
      const errorMessage = fetchError instanceof Error ? fetchError.message : 'Unknown fetch error';
      setError(errorMessage);
      
      if (enableLogging) {
        handleAsyncError(fetchError, 'useDataFetchingWithLogging.fetchData', {
          url: url.replace(/\/api\//, '/****/'),
          retryAttempts: currentRetry,
          lastSuccessfulFetch: lastFetchTime ? new Date(lastFetchTime).toISOString() : 'never',
          userAgent: navigator.userAgent,
          networkStatus: navigator.onLine ? 'online' : 'offline'
        });
      }
    } finally {
      setLoading(false);
      performance.end(`api_fetch_${url.split('/').pop()}`, timer);
    }
  };

  // Función de refetch manual
  const refetch = async () => {
    if (enableLogging) {
      log.debug('Manual refetch triggered', { 
        url: url.replace(/\/api\//, '/****/'),
        hadPreviousData: !!data
      });
    }
    
    setRetryCount(0); // Reset retry count
    await fetchData(false);
  };

  // Efecto inicial
  useEffect(() => {
    fetchData();
    
    // Cleanup: log cuando el componente se desmonta
    return () => {
      if (enableLogging) {
        log.debug('Hook cleanup - component unmounting', { 
          url: url.replace(/\/api\//, '/****/'),
          hadData: !!data,
          hadError: !!error
        });
      }
    };
  }, [url]); // Solo re-fetch si la URL cambia

  // Log de estado para debugging (solo desarrollo)
  useEffect(() => {
    if (enableLogging && (data || error)) {
      log.debug('Hook state updated', { 
        url: url.replace(/\/api\//, '/****/'),
        hasData: !!data,
        hasError: !!error,
        loading,
        retryCount
      });
    }
  }, [data, error, loading, retryCount]);

  return {
    data,
    loading,
    error,
    refetch
  };
}

/**
 * Hook especializado para datos de pagos
 */
export function usePaymentDataWithLogging(periodId?: string) {
  const url = periodId ? `/api/payments?periodId=${periodId}` : '/api/payments';
  
  return useDataFetchingWithLogging(url, {
    enableLogging: true,
    retryAttempts: 3,
    cacheTime: 2 * 60 * 1000 // 2 minutos para datos de pago
  });
}

/**
 * Hook para datos menos críticos (sin logging extenso)
 */
export function useStaticDataWithLogging<T>(url: string) {
  return useDataFetchingWithLogging<T>(url, {
    enableLogging: false, // Datos estáticos no necesitan tanto logging
    retryAttempts: 1,
    cacheTime: 10 * 60 * 1000 // 10 minutos para datos estáticos
  });
}