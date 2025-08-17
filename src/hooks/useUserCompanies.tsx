import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useNavigate } from 'react-router-dom';

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
  const { user, switchRole, userRoles } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserCompanies = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // Get user's company roles first
        const { data: userRoles, error: rolesError } = await supabase
          .from('user_company_roles')
          .select('role, is_active, company_id')
          .eq('user_id', user.id)
          .eq('is_active', true);

        if (rolesError) throw rolesError;

        if (!userRoles || userRoles.length === 0) {
          setCompanies([]);
          setSelectedCompany(null);
          setLoading(false);
          return;
        }

        // Get company information for all companies using secure RPC
        const companyIds = userRoles.map(role => role.company_id);
        const { data: companiesData, error: companiesError } = await supabase
          .rpc('get_companies_basic_info');

        if (companiesError) throw companiesError;

        if (!companiesData || companiesData.length === 0) {
          setCompanies([]);
          setSelectedCompany(null);
          setLoading(false);
          return;
        }

        // The RPC function already filters by user access, so we just need to filter by the user's roles
        const userCompanyIds = userRoles.map(role => role.company_id);
        const filteredCompanies = companiesData?.filter(company => userCompanyIds.includes(company.id)) || [];

        // Create a map of companies for quick lookup
        const companiesMap = new Map(filteredCompanies.map(company => [company.id, company]));

        // Define role hierarchy (higher number = higher priority)
        const roleHierarchy: { [key: string]: number } = {
          'superadmin': 6,
          'company_owner': 5,
          'general_manager': 4,
          'operations_manager': 3,
          'senior_dispatcher': 2,
          'dispatcher': 1,
          'driver': 0,
          'safety_manager': 2
        };

        // Group by company and keep the highest role
        const roleCompaniesMap = new Map<string, any>();
        
        userRoles.forEach((userRole: any) => {
          const companyId = userRole.company_id;
          const currentRole = userRole.role;
          const currentRolePriority = roleHierarchy[currentRole] || 0;
          
          if (!roleCompaniesMap.has(companyId) || 
              currentRolePriority > (roleHierarchy[roleCompaniesMap.get(companyId).role] || 0)) {
            roleCompaniesMap.set(companyId, userRole);
          }
        });

        // Transform the data to match our interface
        const transformedCompanies: UserCompany[] = Array.from(roleCompaniesMap.values()).map((userRole: any) => {
          const company = companiesMap.get(userRole.company_id);
          if (!company) return null;
          
          return {
            id: company.id,
            name: company.name,
            role: userRole.role,
            avatar: company.name
              .split(' ')
              .map((word: string) => word.charAt(0))
              .join('')
              .substring(0, 2)
              .toUpperCase(),
            logo_url: company.logo_url
          };
        }).filter(Boolean) as UserCompany[];

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

  // Function to get the correct dashboard route for a role
  const getDashboardRoute = (role: string): string => {
    switch (role) {
      case 'company_owner':
        return '/dashboard/owner';
      case 'operations_manager':
        return '/dashboard/operations';
      case 'dispatcher':
      case 'senior_dispatcher':
        return '/dashboard/dispatch';
      case 'driver':
        return '/dashboard/driver';
      case 'superadmin':
        return '/superadmin';
      default:
        return '/dashboard/dispatch'; // fallback
    }
  };

  // Custom setSelectedCompany that also updates the auth context role
  const handleSetSelectedCompany = (company: UserCompany) => {
    console.log('Setting selected company:', company);
    console.log('Available userRoles:', userRoles);
    
    setSelectedCompany(company);
    
    // Find the corresponding role in the auth context and switch to it
    const correspondingRole = userRoles.find(role => 
      role.company_id === company.id && role.role === company.role
    );
    
    console.log('Found corresponding role:', correspondingRole);
    
    if (correspondingRole) {
      console.log('Switching to role:', correspondingRole);
      switchRole(correspondingRole.id);
      
      // Navigate to the appropriate dashboard for the new role
      const dashboardRoute = getDashboardRoute(company.role);
      console.log('Navigating to:', dashboardRoute);
      navigate(dashboardRoute);
    } else {
      console.warn('No corresponding role found for company:', company);
    }
  };

  return { 
    companies, 
    selectedCompany, 
    setSelectedCompany: handleSetSelectedCompany, 
    loading 
  };
};