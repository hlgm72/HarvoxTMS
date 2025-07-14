import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

/**
 * Hook especializado para cachear datos de compañía
 * Evita ERR_INSUFFICIENT_RESOURCES usando cache global
 */
export const useCompanyCache = () => {
  const { user } = useAuth();

  // Query para obtener compañía del usuario (cache global)
  const userCompanyQuery = useQuery({
    queryKey: ['user-company', user?.id],
    queryFn: async () => {
      if (!user) throw new Error('User not authenticated');
      
      const { data, error } = await supabase
        .from('user_company_roles')
        .select('company_id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();
        
      if (error) throw error;
      return data;
    },
    enabled: !!user,
    staleTime: 600000, // 10 minutos - datos de compañía no cambian frecuentemente
    gcTime: 1800000, // 30 minutos en cache
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
  });

  // Query para obtener usuarios de la compañía (cache global)
  const companyUsersQuery = useQuery({
    queryKey: ['company-users', userCompanyQuery.data?.company_id],
    queryFn: async () => {
      if (!userCompanyQuery.data?.company_id) return [];
      
      const { data, error } = await supabase
        .from('user_company_roles')
        .select('user_id')
        .eq('company_id', userCompanyQuery.data.company_id)
        .eq('is_active', true);
        
      if (error) throw error;
      return data?.map(u => u.user_id) || [];
    },
    enabled: !!userCompanyQuery.data?.company_id,
    staleTime: 300000, // 5 minutos
    gcTime: 900000, // 15 minutos en cache
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
  });

  return {
    userCompany: userCompanyQuery.data,
    companyUsers: companyUsersQuery.data || [],
    isLoading: userCompanyQuery.isLoading || companyUsersQuery.isLoading,
    error: userCompanyQuery.error || companyUsersQuery.error,
    refetch: () => {
      userCompanyQuery.refetch();
      companyUsersQuery.refetch();
    }
  };
};