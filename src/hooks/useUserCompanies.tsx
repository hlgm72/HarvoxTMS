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
        const companiesMap = new Map<string, any>();
        
        userRoles.forEach((userRole: any) => {
          const companyId = userRole.companies.id;
          const currentRole = userRole.role;
          const currentRolePriority = roleHierarchy[currentRole] || 0;
          
          if (!companiesMap.has(companyId) || 
              currentRolePriority > (roleHierarchy[companiesMap.get(companyId).role] || 0)) {
            companiesMap.set(companyId, userRole);
          }
        });

        // Transform the data to match our interface
        const transformedCompanies: UserCompany[] = Array.from(companiesMap.values()).map((userRole: any) => ({
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
      switchRole(correspondingRole);
      
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