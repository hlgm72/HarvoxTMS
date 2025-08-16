import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface CompanyStats {
  total_companies: number;
  total_users: number;
  total_vehicles: number;
  total_drivers: number;
}

interface Company {
  id: string;
  name: string;
  email: string;
  phone: string;
  street_address?: string;
  state_id?: string;
  zip_code?: string;
  owner_name: string;
  owner_email: string;
  owner_phone: string;
  owner_title: string;
  plan_type: string;
  max_vehicles: number;
  max_users: number;
  status: string;
  contract_start_date: string;
  created_at: string;
}

export const useSuperAdminDashboard = () => {
  const [stats, setStats] = useState<CompanyStats>({
    total_companies: 0,
    total_users: 0,
    total_vehicles: 0,
    total_drivers: 0,
  });
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Optimized stats fetching - parallel queries
  const fetchSystemStats = useCallback(async () => {
    try {
      const [companiesResult, usersResult, vehiclesResult, driversResult] = await Promise.all([
        supabase.from('companies').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('geotab_vehicles').select('*', { count: 'exact', head: true }),
        supabase.from('geotab_drivers').select('*', { count: 'exact', head: true })
      ]);

      setStats({
        total_companies: companiesResult.count || 0,
        total_users: usersResult.count || 0,
        total_vehicles: vehiclesResult.count || 0,
        total_drivers: driversResult.count || 0,
      });
    } catch (error) {
      console.error('Error fetching system stats:', error);
    }
  }, []);

  // Optimized companies fetching using secure RPC function
  const fetchCompanies = useCallback(async () => {
    try {
      // Use the secure RPC function for financial data access
      const { data, error } = await supabase
        .rpc('get_companies_financial_data' as any);

      if (error) throw error;
      
      // Transform the data to match the expected format
      const companiesData = Array.isArray(data) ? data.map((company: any) => ({
        id: company.id,
        name: company.name,
        street_address: company.street_address,
        state_id: company.state_id,
        zip_code: company.zip_code,
        city: company.city,
        phone: company.phone,
        email: company.email,
        ein: company.ein,
        dot_number: company.dot_number,
        mc_number: company.mc_number,
        plan_type: company.plan_type,
        max_vehicles: company.max_vehicles,
        max_users: company.max_users,
        status: company.status,
        contract_start_date: company.contract_start_date,
        created_at: company.created_at,
        // For superadmin dashboard, we'll fetch owner details separately if needed
        owner_name: 'Protected',
        owner_email: 'Protected', 
        owner_phone: 'Protected',
        owner_title: 'Protected'
      })) : [];
      
      setCompanies(companiesData.slice(0, 10)); // Limit to 10 for dashboard
    } catch (error) {
      console.error('Error fetching companies:', error);
      setCompanies([]);
    } finally {
      setLoadingData(false);
    }
  }, []);

  // Optimized initialization - fetch both in parallel
  const initializeDashboard = useCallback(async () => {
    setLoadingData(true);
    await Promise.all([
      fetchSystemStats(),
      fetchCompanies()
    ]);
  }, [fetchSystemStats, fetchCompanies]);

  return {
    stats,
    companies,
    loadingData,
    fetchSystemStats,
    fetchCompanies,
    initializeDashboard
  };
};