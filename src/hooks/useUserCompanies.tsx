import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface UserCompany {
  id: string;
  name: string;
  role: string;
  avatar: string;
  logo_url?: string;
}

export const useUserCompanies = () => {
  const [companies, setCompanies] = useState<UserCompany[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<UserCompany | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const fetchUserCompanies = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // Get user's company roles with company information
        const { data: userRoles, error: rolesError } = await supabase
          .from('user_company_roles')
          .select(`
            role,
            is_active,
            companies (
              id,
              name,
              logo_url
            )
          `)
          .eq('user_id', user.id)
          .eq('is_active', true);

        if (rolesError) throw rolesError;

        if (!userRoles || userRoles.length === 0) {
          setCompanies([]);
          setSelectedCompany(null);
          setLoading(false);
          return;
        }

        // Transform the data to match our interface
        const transformedCompanies: UserCompany[] = userRoles.map((userRole: any) => ({
          id: userRole.companies.id,
          name: userRole.companies.name,
          role: userRole.role,
          avatar: userRole.companies.name
            .split(' ')
            .map((word: string) => word.charAt(0))
            .join('')
            .substring(0, 2)
            .toUpperCase(),
          logo_url: userRole.companies.logo_url
        }));

        setCompanies(transformedCompanies);
        
        // Set the first company as selected by default if none is selected
        if (!selectedCompany && transformedCompanies.length > 0) {
          setSelectedCompany(transformedCompanies[0]);
        }

      } catch (error) {
        console.error('Error fetching user companies:', error);
        setCompanies([]);
        setSelectedCompany(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUserCompanies();
  }, [user]);

  return { 
    companies, 
    selectedCompany, 
    setSelectedCompany, 
    loading 
  };
};