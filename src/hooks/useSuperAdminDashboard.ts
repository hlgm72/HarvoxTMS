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

  // Optimized companies fetching with selective fields
  // Note: Using companies_financial view for superadmin access to sensitive data
  const fetchCompanies = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('companies_with_owner_info')
        .select(`
          id, name, street_address, state_id, zip_code, city, phone, email,
          ein, dot_number, mc_number,
          owner_name, owner_email, owner_phone, owner_title,
          plan_type, max_vehicles, max_users, status,
          contract_start_date, created_at
        `)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setCompanies(data || []);
    } catch (error) {
      console.error('Error fetching companies:', error);
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