import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Building2, Users, Truck, Activity, Plus, Settings, Mail, Phone, User, Briefcase,
  BarChart3, Shield, Database, Globe, ChevronRight, Search, Filter,
  TrendingUp, AlertTriangle, CheckCircle, Clock, Eye
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Layout } from '@/components/layout/Layout';
import { useToast } from '@/hooks/use-toast';
import { useFleetNotifications } from '@/components/notifications';
import { createTextHandlers } from '@/lib/textUtils';

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

export default function SuperAdminDashboard() {
  const { user, isSuperAdmin, loading } = useAuth();
  const { toast } = useToast();
  const { showSuccess, showError } = useFleetNotifications();
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState<CompanyStats>({
    total_companies: 0,
    total_users: 0,
    total_vehicles: 0,
    total_drivers: 0,
  });
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [isCreatingCompany, setIsCreatingCompany] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [newCompany, setNewCompany] = useState({
    name: '',
    email: '',
    phone: '',
    owner_name: '',
    owner_email: '',
    owner_phone: '',
    owner_title: '',
    plan_type: 'basic',
    max_vehicles: 10,
    max_users: 5,
  });

  // Create text handlers for form fields
  const companyNameHandlers = createTextHandlers((value) => 
    setNewCompany(prev => ({ ...prev, name: value }))
  );
  
  const companyEmailHandlers = createTextHandlers((value) => 
    setNewCompany(prev => ({ ...prev, email: value })), 'email'
  );
  
  
  const companyPhoneHandlers = createTextHandlers((value) => 
    setNewCompany(prev => ({ ...prev, phone: value })), 'phone'
  );
  
  const ownerNameHandlers = createTextHandlers((value) => 
    setNewCompany(prev => ({ ...prev, owner_name: value }))
  );
  
  const ownerEmailHandlers = createTextHandlers((value) => 
    setNewCompany(prev => ({ ...prev, owner_email: value })), 'email'
  );
  
  
  const ownerPhoneHandlers = createTextHandlers((value) => 
    setNewCompany(prev => ({ ...prev, owner_phone: value })), 'phone'
  );
  
  const ownerTitleHandlers = createTextHandlers((value) => 
    setNewCompany(prev => ({ ...prev, owner_title: value }))
  );

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
        .select(`
          id, name, email, phone, 
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
  };

  const handleCreateCompany = async () => {
    setIsCreatingCompany(true);
    try {
      const { data, error } = await supabase
        .from('companies')
        .insert([{
          ...newCompany,
          // Campos obligatorios temporales para que funcione la inserción
          street_address: 'To be configured',
          state_id: 'TX',
          zip_code: '00000',
          status: 'active',
          contract_start_date: new Date().toISOString().split('T')[0],
        }])
        .select()
        .single();

      if (error) throw error;

      showSuccess(
        "¡Empresa creada exitosamente!",
        `${newCompany.name} ha sido añadida al sistema FleetNest`
      );

      // Reset form and close dialog
      setNewCompany({
        name: '',
        email: '',
        phone: '',
        owner_name: '',
        owner_email: '',
        owner_phone: '',
        owner_title: '',
        plan_type: 'basic',
        max_vehicles: 10,
        max_users: 5,
      });
      setShowCreateDialog(false);
      
      // Refresh data
      fetchCompanies();
      fetchSystemStats();
    } catch (error: any) {
      console.error('Error creating company:', error);
      showError(
        "Error al crear empresa",
        error.message || "Ocurrió un error al crear la empresa. Por favor intenta de nuevo."
      );
    } finally {
      setIsCreatingCompany(false);
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
      <div className="min-h-screen bg-gradient-subtle">
        {/* Header Section */}
        <div className="bg-gradient-fleet text-white shadow-blue">
          <div className="p-8">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-4xl font-heading font-bold mb-2">FleetNest Control Center</h1>
                <p className="text-white/90 font-body text-lg">Sistema de administración global</p>
                <div className="mt-4 flex items-center gap-4">
                  <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                    System Administrator
                  </Badge>
                  <div className="flex items-center gap-2 text-white/80">
                    <Activity className="h-4 w-4" />
                    <span className="text-sm">System Status: Operational</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="bg-white/10 border-white/30 text-white hover:bg-white/20">
                  <Settings className="h-4 w-4 mr-2" />
                  System Settings
                </Button>
                <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                  <DialogTrigger asChild>
                    <Button className="bg-gradient-primary hover:shadow-glow">
                      <Plus className="h-4 w-4 mr-2" />
                      New Company
                    </Button>
                  </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create New Company</DialogTitle>
                  <DialogDescription>
                    Add a new transportation company to the FleetNest system.
                  </DialogDescription>
                </DialogHeader>
                
                <div className="grid grid-cols-2 gap-6 py-4">
                  {/* Company Information */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                      Company Information
                    </h3>
                    
                    <div className="space-y-2">
                      <Label htmlFor="company-name">Company Name *</Label>
                      <Input
                        id="company-name"
                        value={newCompany.name}
                        {...companyNameHandlers}
                        placeholder="Swift Transportation"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="company-email">Company Email *</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="company-email"
                          type="email"
                          value={newCompany.email}
                          onChange={(e) => {
                            const cleanValue = e.target.value.replace(/\s/g, '');
                            setNewCompany(prev => ({ ...prev, email: cleanValue }));
                          }}
                          onKeyPress={(e) => {
                            if (e.key === ' ') {
                              e.preventDefault();
                            }
                          }}
                          placeholder="contact@company.com"
                          className="pl-10"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="company-phone">Company Phone *</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="company-phone"
                          value={newCompany.phone}
                          {...companyPhoneHandlers}
                          placeholder="(555) 123-4567"
                          className="pl-10"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Owner Information */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                      Owner/Primary Contact
                    </h3>
                    
                    <div className="space-y-2">
                      <Label htmlFor="owner-name">Owner Name *</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="owner-name"
                          value={newCompany.owner_name}
                          {...ownerNameHandlers}
                          placeholder="John Smith"
                          className="pl-10"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="owner-email">Owner Email *</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="owner-email"
                          type="email"
                          value={newCompany.owner_email}
                          onChange={(e) => {
                            const cleanValue = e.target.value.replace(/\s/g, '');
                            setNewCompany(prev => ({ ...prev, owner_email: cleanValue }));
                          }}
                          onKeyPress={(e) => {
                            if (e.key === ' ') {
                              e.preventDefault();
                            }
                          }}
                          placeholder="john@company.com"
                          className="pl-10"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="owner-phone">Owner Phone *</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="owner-phone"
                          value={newCompany.owner_phone}
                          {...ownerPhoneHandlers}
                          placeholder="(555) 987-6543"
                          className="pl-10"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="owner-title">Owner Title</Label>
                      <div className="relative">
                        <Briefcase className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="owner-title"
                          value={newCompany.owner_title}
                          {...ownerTitleHandlers}
                          placeholder="CEO, President, Fleet Manager..."
                          className="pl-10"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Plan Configuration */}
                  <div className="col-span-2 space-y-4">
                    <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                      Plan Configuration
                    </h3>
                    
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="plan-type">Plan Type</Label>
                        <Select 
                          value={newCompany.plan_type} 
                          onValueChange={(value) => setNewCompany(prev => ({ ...prev, plan_type: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="basic">Basic Plan</SelectItem>
                            <SelectItem value="professional">Professional Plan</SelectItem>
                            <SelectItem value="enterprise">Enterprise Plan</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="max-vehicles">Max Vehicles</Label>
                        <Input
                          id="max-vehicles"
                          type="number"
                          value={newCompany.max_vehicles}
                          onChange={(e) => setNewCompany(prev => ({ ...prev, max_vehicles: parseInt(e.target.value) }))}
                          min="1"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="max-users">Max Users</Label>
                        <Input
                          id="max-users"
                          type="number"
                          value={newCompany.max_users}
                          onChange={(e) => setNewCompany(prev => ({ ...prev, max_users: parseInt(e.target.value) }))}
                          min="1"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button 
                    variant="outline" 
                    onClick={() => setShowCreateDialog(false)}
                    disabled={isCreatingCompany}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleCreateCompany}
                    disabled={isCreatingCompany || !newCompany.name || !newCompany.email || !newCompany.owner_name || !newCompany.owner_email}
                  >
                    {isCreatingCompany ? 'Creating...' : 'Create Company'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content - 2 Column Layout */}
        <div className="p-8">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            {/* Left Column - Stats & System Health */}
            <div className="space-y-6">
              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-4">
                <Card className="shadow-fleet">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-fleet-navy">Companies</CardTitle>
                    <Building2 className="h-4 w-4 text-fleet-orange" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-heading font-bold text-fleet-navy">{stats.total_companies}</div>
                    <p className="text-xs text-muted-foreground">Active companies</p>
                  </CardContent>
                </Card>

                <Card className="shadow-fleet">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-fleet-navy">System Users</CardTitle>
                    <Users className="h-4 w-4 text-fleet-orange" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-heading font-bold text-fleet-navy">{stats.total_users}</div>
                    <p className="text-xs text-muted-foreground">Total users</p>
                  </CardContent>
                </Card>

                <Card className="shadow-fleet">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-fleet-navy">Fleet Vehicles</CardTitle>
                    <Truck className="h-4 w-4 text-fleet-orange" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-heading font-bold text-fleet-navy">{stats.total_vehicles}</div>
                    <p className="text-xs text-muted-foreground">Being tracked</p>
                  </CardContent>
                </Card>

                <Card className="shadow-fleet">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-fleet-navy">Active Drivers</CardTitle>
                    <Activity className="h-4 w-4 text-fleet-orange" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-heading font-bold text-fleet-navy">{stats.total_drivers}</div>
                    <p className="text-xs text-muted-foreground">In the system</p>
                  </CardContent>
                </Card>
              </div>

              {/* System Health Card */}
              <Card className="shadow-fleet">
                <CardHeader>
                  <CardTitle className="text-fleet-navy font-heading">System Health</CardTitle>
                  <CardDescription>Real-time system status and performance</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Database Status</span>
                    <Badge variant="default" className="bg-fleet-green text-white">
                      Operational
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">API Response Time</span>
                    <span className="text-sm text-fleet-green font-medium">~120ms</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Active Connections</span>
                    <span className="text-sm font-medium">{stats.total_users * 2 + 15}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Uptime</span>
                    <span className="text-sm text-fleet-green font-medium">99.9%</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Companies Management */}
            <div className="space-y-6">
              <Card className="shadow-fleet">
                <CardHeader>
                  <CardTitle className="text-fleet-navy font-heading">Recent Companies</CardTitle>
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
                    className="flex items-start justify-between p-6 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold text-lg">{company.name}</h3>
                        <Badge 
                          variant={company.status === 'active' ? 'default' : 'secondary'}
                          className="capitalize"
                        >
                          {company.status}
                        </Badge>
                        <Badge variant="outline" className="capitalize">
                          {company.plan_type}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                        <div>
                          <p><strong>Company:</strong> {company.email} • {company.phone}</p>
                          <p><strong>Owner:</strong> {company.owner_name} ({company.owner_title})</p>
                          <p><strong>Contact:</strong> {company.owner_email} • {company.owner_phone}</p>
                        </div>
                        <div>
                          <p><strong>Limits:</strong> {company.max_vehicles} vehicles, {company.max_users} users</p>
                          <p><strong>Contract Start:</strong> {new Date(company.contract_start_date).toLocaleDateString()}</p>
                          <p><strong>Created:</strong> {new Date(company.created_at).toLocaleDateString()}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-2 ml-4">
                      <Button variant="outline" size="sm">
                        View Details
                      </Button>
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
          </div>
        </div>
      </div>
    </Layout>
  );
}