import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Building2, Users, Truck, Activity, Plus, Settings } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Layout } from '@/components/layout/Layout';

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
  city_id: string;
  state_id: string;
  created_at: string;
}

export default function SuperAdminDashboard() {
  const { user, isSuperAdmin, loading } = useAuth();
  const [stats, setStats] = useState<CompanyStats>({
    total_companies: 0,
    total_users: 0,
    total_vehicles: 0,
    total_drivers: 0,
  });
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!loading && isSuperAdmin) {
      fetchSystemStats();
      fetchCompanies();
    }
  }, [loading, isSuperAdmin]);

  const fetchSystemStats = async () => {
    try {
      // Fetch companies count
      const { count: companiesCount } = await supabase
        .from('companies')
        .select('*', { count: 'exact', head: true });

      // Fetch users count
      const { count: usersCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Fetch vehicles count
      const { count: vehiclesCount } = await supabase
        .from('vehicles')
        .select('*', { count: 'exact', head: true });

      // Fetch drivers count
      const { count: driversCount } = await supabase
        .from('drivers')
        .select('*', { count: 'exact', head: true });

      setStats({
        total_companies: companiesCount || 0,
        total_users: usersCount || 0,
        total_vehicles: vehiclesCount || 0,
        total_drivers: driversCount || 0,
      });
    } catch (error) {
      console.error('Error fetching system stats:', error);
    }
  };

  const fetchCompanies = async () => {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setCompanies(data || []);
    } catch (error) {
      console.error('Error fetching companies:', error);
    } finally {
      setLoadingData(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="p-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-muted-foreground">Loading...</p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!isSuperAdmin) {
    return (
      <Layout>
        <div className="p-6">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <h2 className="text-lg font-semibold text-destructive">Access Denied</h2>
                <p className="text-muted-foreground">You don't have permission to access this page.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold">SuperAdmin Dashboard</h1>
            <p className="text-muted-foreground">Sistema de gestión global FleetNest</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <Settings className="h-4 w-4 mr-2" />
              System Settings
            </Button>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Company
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Companies</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_companies}</div>
              <p className="text-xs text-muted-foreground">Active transportation companies</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_users}</div>
              <p className="text-xs text-muted-foreground">System users across all companies</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Vehicles</CardTitle>
              <Truck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_vehicles}</div>
              <p className="text-xs text-muted-foreground">Vehicles being tracked</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Drivers</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_drivers}</div>
              <p className="text-xs text-muted-foreground">Active drivers in the system</p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Companies */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Companies</CardTitle>
            <CardDescription>
              Latest companies registered in the system
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingData ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            ) : companies.length === 0 ? (
              <div className="text-center text-muted-foreground h-32 flex items-center justify-center">
                No companies found
              </div>
            ) : (
              <div className="space-y-4">
                {companies.map((company) => (
                  <div
                    key={company.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex-1">
                      <h3 className="font-medium">{company.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {company.email} • {company.phone}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Created: {new Date(company.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant="secondary">Active</Badge>
                      <Button variant="outline" size="sm">
                        Manage
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}