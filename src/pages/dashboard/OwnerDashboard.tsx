import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  TrendingUp, Users, DollarSign, AlertTriangle, Truck, Settings, Plus,
  Building, User, Phone, Mail, Calendar, BarChart3, FileText, 
  Clock, MapPin, AlertCircle, CheckCircle2, Eye, Edit
} from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useFleetNotifications } from '@/components/notifications';
import { CompanySettingsForm } from '@/components/companies/settings/CompanySettingsForm';
import { Company } from '@/types/company';

// Types
interface CompanyStats {
  total_drivers: number;
  total_vehicles: number;
  total_loads: number;
  total_income: number;
  active_drivers: number;
  pending_payments: number;
}

interface Driver {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  phone: string;
  license_number: string;
  license_expiry_date: string;
  is_active: boolean;
  created_at: string;
}

// Using Company interface from types

export default function OwnerDashboard() {
  const { user, userRole, loading } = useAuth();
  const { toast } = useToast();
  const { showSuccess, showError } = useFleetNotifications();
  
  const [activeTab, setActiveTab] = useState('overview');
  const [loadingData, setLoadingData] = useState(true);
  const [stats, setStats] = useState<CompanyStats>({
    total_drivers: 0,
    total_vehicles: 0,
    total_loads: 0,
    total_income: 0,
    active_drivers: 0,
    pending_payments: 0,
  });
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [companyInfo, setCompanyInfo] = useState<Company | null>(null);

  useEffect(() => {
    if (!loading && user && userRole?.company_id) {
      fetchCompanyData();
      fetchCompanyStats();
      fetchDrivers();
    }
  }, [loading, user, userRole]);

  const fetchCompanyData = async () => {
    if (!userRole?.company_id) return;
    
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('id', userRole.company_id)
        .single();

      if (error) throw error;
      setCompanyInfo(data);
    } catch (error) {
      console.error('Error fetching company data:', error);
    }
  };

  const fetchCompanyStats = async () => {
    if (!userRole?.company_id) return;
    
    try {
      // Get drivers count
      const { count: driversCount } = await supabase
        .from('user_company_roles')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', userRole.company_id)
        .eq('role', 'driver')
        .eq('is_active', true);

      // Get active drivers count  
      const { count: activeDriversCount } = await supabase
        .from('company_drivers')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      // Get loads count for company drivers
      const { data: companyDrivers } = await supabase
        .from('user_company_roles')
        .select('user_id')
        .eq('company_id', userRole.company_id)
        .eq('role', 'driver')
        .eq('is_active', true);

      const driverIds = companyDrivers?.map(d => d.user_id) || [];

      let loadsCount = 0;
      let totalIncome = 0;
      if (driverIds.length > 0) {
        const { count: loads } = await supabase
          .from('loads')
          .select('*', { count: 'exact', head: true })
          .in('driver_user_id', driverIds);

        const { data: loadsData } = await supabase
          .from('loads')
          .select('total_amount')
          .in('driver_user_id', driverIds)
          .eq('status', 'completed');

        loadsCount = loads || 0;
        totalIncome = loadsData?.reduce((sum, load) => sum + (load.total_amount || 0), 0) || 0;
      }

      // Get pending payments count
      const { count: pendingPayments } = await supabase
        .from('payment_periods')
        .select('*', { count: 'exact', head: true })
        .in('driver_user_id', driverIds)
        .eq('status', 'draft');

      setStats({
        total_drivers: driversCount || 0,
        total_vehicles: 0, // Will implement when vehicle management is added
        total_loads: loadsCount,
        total_income: totalIncome,
        active_drivers: activeDriversCount || 0,
        pending_payments: pendingPayments || 0,
      });
    } catch (error) {
      console.error('Error fetching company stats:', error);
    }
  };

  const fetchDrivers = async () => {
    if (!userRole?.company_id) return;
    
    try {
      // First get the driver user IDs from user_company_roles
      const { data: driverRoles, error: rolesError } = await supabase
        .from('user_company_roles')
        .select('user_id')
        .eq('company_id', userRole.company_id)
        .eq('role', 'driver')
        .eq('is_active', true)
        .limit(10);

      if (rolesError) throw rolesError;

      if (!driverRoles || driverRoles.length === 0) {
        setDrivers([]);
        return;
      }

      const driverUserIds = driverRoles.map(role => role.user_id);

      // Get profiles for these users
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, phone')
        .in('user_id', driverUserIds);

      if (profilesError) throw profilesError;

      // Get driver profiles
      const { data: driverProfilesData, error: driverProfilesError } = await supabase
        .from('driver_profiles')
        .select('user_id, license_number, license_expiry_date')
        .in('user_id', driverUserIds);

      if (driverProfilesError) throw driverProfilesError;

      // Get company drivers data
      const { data: companyDriversData, error: companyDriversError } = await supabase
        .from('company_drivers')
        .select('user_id, is_active, created_at')
        .in('user_id', driverUserIds);

      if (companyDriversError) throw companyDriversError;

      // Combine all data
      const formattedDrivers = driverUserIds.map(userId => {
        const profile = profilesData?.find(p => p.user_id === userId);
        const driverProfile = driverProfilesData?.find(dp => dp.user_id === userId);
        const companyDriver = companyDriversData?.find(cd => cd.user_id === userId);

        return {
          id: userId,
          user_id: userId,
          first_name: profile?.first_name || 'N/A',
          last_name: profile?.last_name || 'N/A',
          phone: profile?.phone || 'N/A',
          license_number: driverProfile?.license_number || 'N/A',
          license_expiry_date: driverProfile?.license_expiry_date || 'N/A',
          is_active: companyDriver?.is_active || false,
          created_at: companyDriver?.created_at || new Date().toISOString(),
        };
      });

      setDrivers(formattedDrivers);
    } catch (error) {
      console.error('Error fetching drivers:', error);
    } finally {
      setLoadingData(false);
    }
  };

  if (loading || loadingData) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Cargando dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Header */}
      <div className="bg-primary text-white shadow-lg relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full -translate-y-32 translate-x-32"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white rounded-full translate-y-24 -translate-x-24"></div>
        </div>
        
        <div className="relative p-8">
          <div className="flex justify-between items-start">
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                {companyInfo?.logo_url ? (
                  <div className="h-16 w-16 rounded-full overflow-hidden bg-white/10 flex-shrink-0 border-2 border-white/20">
                    <img 
                      src={companyInfo.logo_url} 
                      alt={`Logo de ${companyInfo.name || 'la empresa'}`}
                      className="h-full w-full object-cover object-center"
                    />
                  </div>
                ) : (
                  <div className="h-16 w-16 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0 border-2 border-white/20">
                    <Building className="h-8 w-8 text-white" />
                  </div>
                )}
                <div>
                  <h1 className="text-4xl font-heading font-bold mb-2 animate-fade-in text-white">
                    {companyInfo?.name || 'Mi Empresa'}
                  </h1>
                  <p className="text-white font-body text-lg">Dashboard Ejecutivo</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4 animate-fade-in" style={{animationDelay: '0.1s'}}>
                <Badge variant="secondary" className="bg-white text-primary border-0 hover:bg-white/90 transition-colors font-semibold">
                  <Building className="h-3 w-3 mr-1" />
                  Propietario
                </Badge>
                <div className="flex items-center gap-2 text-white">
                  <div className="h-2 w-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium">Sistema Operativo</span>
                </div>
              </div>
            </div>
            
            <div className="flex gap-3 animate-fade-in" style={{animationDelay: '0.2s'}}>
              <Button 
                variant="outline" 
                className="bg-white/10 border-white text-white hover:bg-white hover:text-primary transition-all hover:scale-105 font-medium"
                onClick={() => setActiveTab('settings')}
              >
                <Settings className="h-4 w-4 mr-2" />
                Configuración
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 bg-white shadow-sm border">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="drivers" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Conductores
            </TabsTrigger>
            <TabsTrigger value="fleet" className="flex items-center gap-2">
              <Truck className="h-4 w-4" />
              Flota
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Reportes
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Configuración
            </TabsTrigger>
          </TabsList>

          {/* Dashboard Overview */}
          <TabsContent value="overview" className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="hover:shadow-elegant transition-all duration-300 animate-fade-in">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Ingresos Totales</p>
                      <p className="text-3xl font-bold text-green-600">${stats.total_income.toLocaleString()}</p>
                    </div>
                    <div className="p-3 bg-green-100 rounded-full">
                      <DollarSign className="h-6 w-6 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="hover:shadow-elegant transition-all duration-300 animate-fade-in">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Conductores Activos</p>
                      <p className="text-3xl font-bold text-blue-600">{stats.active_drivers}</p>
                    </div>
                    <div className="p-3 bg-blue-100 rounded-full">
                      <Users className="h-6 w-6 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="hover:shadow-elegant transition-all duration-300 animate-fade-in">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Cargas Completadas</p>
                      <p className="text-3xl font-bold text-purple-600">{stats.total_loads}</p>
                    </div>
                    <div className="p-3 bg-purple-100 rounded-full">
                      <Truck className="h-6 w-6 text-purple-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="hover:shadow-elegant transition-all duration-300 animate-fade-in">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Pagos Pendientes</p>
                      <p className="text-3xl font-bold text-orange-600">{stats.pending_payments}</p>
                    </div>
                    <div className="p-3 bg-orange-100 rounded-full">
                      <AlertTriangle className="h-6 w-6 text-orange-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5 text-primary" />
                  Acciones Rápidas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                   <Button className="h-20 flex-col gap-2">
                     <User className="h-6 w-6" />
                     Nuevo Conductor
                   </Button>
                  <Button variant="outline" className="h-20 flex-col gap-2">
                    <Truck className="h-6 w-6" />
                    Nuevo Vehículo
                  </Button>
                  <Button variant="outline" className="h-20 flex-col gap-2">
                    <FileText className="h-6 w-6" />
                    Nuevo Reporte
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Drivers Management */}
          <TabsContent value="drivers" className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold">Gestión de Conductores</h2>
                <p className="text-muted-foreground">Administra tu equipo de conductores</p>
              </div>
               <Button>
                 <Plus className="h-4 w-4 mr-2" />
                 Nuevo Conductor
               </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {drivers.map((driver) => (
                <Card key={driver.id} className="hover:shadow-elegant transition-all duration-300">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{driver.first_name} {driver.last_name}</CardTitle>
                          <p className="text-sm text-muted-foreground">{driver.license_number}</p>
                        </div>
                      </div>
                      <Badge variant={driver.is_active ? "default" : "secondary"}>
                        {driver.is_active ? "Activo" : "Inactivo"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{driver.phone}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">CDL vence: {new Date(driver.license_expiry_date).toLocaleDateString()}</span>
                      </div>
                    </div>
                    
                    <div className="flex gap-2 mt-4">
                      <Button variant="outline" size="sm" className="flex-1">
                        <Eye className="h-4 w-4 mr-1" />
                        Ver
                      </Button>
                      <Button variant="outline" size="sm" className="flex-1">
                        <Edit className="h-4 w-4 mr-1" />
                        Editar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Fleet Management */}
          <TabsContent value="fleet" className="space-y-6">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-12">
                  <Truck className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Gestión de Flota</h3>
                  <p className="text-muted-foreground mb-4">La gestión de vehículos estará disponible próximamente</p>
                  <Button variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    Agregar Vehículo
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Reports */}
          <TabsContent value="reports" className="space-y-6">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-12">
                  <BarChart3 className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Reportes y Análisis</h3>
                  <p className="text-muted-foreground mb-4">Los reportes detallados estarán disponibles próximamente</p>
                  <Button variant="outline">
                    <FileText className="h-4 w-4 mr-2" />
                    Generar Reporte
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings */}
          <TabsContent value="settings" className="space-y-6">
            <CompanySettingsForm 
              company={companyInfo as Company} 
              onUpdate={setCompanyInfo}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}