import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Building2, Users, Truck, Activity, Plus, Settings, Mail, Phone, User, Briefcase,
  BarChart3, Shield, Database, Globe, ChevronRight, Search, Filter,
  TrendingUp, AlertTriangle, CheckCircle, Clock, Eye, Trash2, Edit
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
  
  const [companyToDelete, setCompanyToDelete] = useState<Company | null>(null);
  const [deleteValidation, setDeleteValidation] = useState<any>(null);
  const [isDeletingCompany, setIsDeletingCompany] = useState(false);
  
  const [companyToEdit, setCompanyToEdit] = useState<Company | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [isUpdatingCompany, setIsUpdatingCompany] = useState(false);

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

  const validateCompanyDeletion = async (company: Company) => {
    try {
      const { data, error } = await supabase.rpc('can_delete_test_company', {
        company_id_param: company.id
      });

      if (error) throw error;
      
      setDeleteValidation(data);
      setCompanyToDelete(company);
    } catch (error: any) {
      console.error('Error validating company deletion:', error);
      showError(
        "Error validating deletion",
        error.message || "Could not validate if company can be deleted"
      );
    }
  };

  const handleDeleteCompany = async () => {
    if (!companyToDelete) return;
    
    setIsDeletingCompany(true);
    try {
      const { data, error } = await supabase.rpc('delete_test_company', {
        company_id_param: companyToDelete.id
      });

      if (error) throw error;

      if ((data as any)?.success) {
        showSuccess(
          "Company deleted successfully",
          `${(data as any).company_name} and all related data has been permanently removed`
        );
        
        // Refresh data
        fetchCompanies();
        fetchSystemStats();
      } else {
        showError("Deletion failed", (data as any)?.message || "Unknown error occurred");
      }
    } catch (error: any) {
      console.error('Error deleting company:', error);
      showError(
        "Error deleting company",
        error.message || "An error occurred while deleting the company"
      );
    } finally {
      setIsDeletingCompany(false);
      setCompanyToDelete(null);
      setDeleteValidation(null);
    }
  };

  const handleEditCompany = (company: Company) => {
    setCompanyToEdit(company);
    setShowEditDialog(true);
  };

  const handleUpdateCompany = async () => {
    if (!companyToEdit) return;
    
    setIsUpdatingCompany(true);
    try {
      const { error } = await supabase
        .from('companies')
        .update({
          name: companyToEdit.name,
          email: companyToEdit.email,
          phone: companyToEdit.phone,
          street_address: companyToEdit.street_address || 'To be configured',
          state_id: companyToEdit.state_id || 'TX',
          zip_code: companyToEdit.zip_code || '00000',
          owner_name: companyToEdit.owner_name,
          owner_email: companyToEdit.owner_email,
          owner_phone: companyToEdit.owner_phone,
          owner_title: companyToEdit.owner_title,
          plan_type: companyToEdit.plan_type,
          max_vehicles: companyToEdit.max_vehicles,
          max_users: companyToEdit.max_users,
          status: companyToEdit.status,
        })
        .eq('id', companyToEdit.id);

      if (error) throw error;

      showSuccess(
        "Company updated successfully",
        `${companyToEdit.name} has been updated in the system`
      );
      
      // Refresh data and close dialog
      fetchCompanies();
      setShowEditDialog(false);
      setCompanyToEdit(null);
    } catch (error: any) {
      console.error('Error updating company:', error);
      showError(
        "Error updating company",
        error.message || "An error occurred while updating the company"
      );
    } finally {
      setIsUpdatingCompany(false);
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
        {/* Enhanced Header Section */}
        <div className="bg-primary text-white shadow-lg relative overflow-hidden">
          {/* Background decoration */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full -translate-y-32 translate-x-32"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white rounded-full translate-y-24 -translate-x-24"></div>
          </div>
          
          <div className="relative p-8">
            <div className="flex justify-between items-start">
              <div className="space-y-4">
                <div>
                  <h1 className="text-4xl font-heading font-bold mb-2 animate-fade-in text-white">
                    FleetNest Control Center
                  </h1>
                  <p className="text-white font-body text-lg">Sistema de administración global</p>
                </div>
                
                <div className="flex items-center gap-4 animate-fade-in" style={{animationDelay: '0.1s'}}>
                  <Badge variant="secondary" className="bg-white text-primary border-0 hover:bg-white/90 transition-colors font-semibold">
                    <Shield className="h-3 w-3 mr-1" />
                    System Administrator
                  </Badge>
                  <div className="flex items-center gap-2 text-white">
                    <div className="h-2 w-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-sm font-medium">System Status: Operational</span>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-3 animate-fade-in" style={{animationDelay: '0.2s'}}>
                <Button 
                  variant="outline" 
                  className="bg-white/10 border-white text-white hover:bg-white hover:text-primary transition-all hover:scale-105 font-medium"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  System Settings
                </Button>
                <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                  <DialogTrigger asChild>
                    <Button className="bg-gradient-primary hover:shadow-glow transition-all hover:scale-105">
                      <Plus className="h-4 w-4 mr-2" />
                      New Company
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <Building2 className="h-5 w-5 text-primary" />
                        Create New Company
                      </DialogTitle>
                      <DialogDescription>
                        Add a new transportation company to the FleetNest system.
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="grid grid-cols-2 gap-6 py-4">
                      {/* Company Information */}
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 pb-2 border-b">
                          <Building2 className="h-4 w-4 text-primary" />
                          <h3 className="font-semibold text-sm text-primary uppercase tracking-wide">
                            Company Information
                          </h3>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="company-name">Company Name *</Label>
                          <Input
                            id="company-name"
                            value={newCompany.name}
                            {...companyNameHandlers}
                            placeholder="Swift Transportation"
                            className="transition-all focus:scale-[1.01]"
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
                              className="pl-10 transition-all focus:scale-[1.01]"
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
                              className="pl-10 transition-all focus:scale-[1.01]"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Owner Information */}
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 pb-2 border-b">
                          <User className="h-4 w-4 text-primary" />
                          <h3 className="font-semibold text-sm text-primary uppercase tracking-wide">
                            Owner/Primary Contact
                          </h3>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="owner-name">Owner Name *</Label>
                          <div className="relative">
                            <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                              id="owner-name"
                              value={newCompany.owner_name}
                              {...ownerNameHandlers}
                              placeholder="John Smith"
                              className="pl-10 transition-all focus:scale-[1.01]"
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
                              className="pl-10 transition-all focus:scale-[1.01]"
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
                              className="pl-10 transition-all focus:scale-[1.01]"
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
                              className="pl-10 transition-all focus:scale-[1.01]"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Plan Configuration */}
                      <div className="col-span-2 space-y-4">
                        <div className="flex items-center gap-2 pb-2 border-b">
                          <BarChart3 className="h-4 w-4 text-primary" />
                          <h3 className="font-semibold text-sm text-primary uppercase tracking-wide">
                            Plan Configuration
                          </h3>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="plan-type">Plan Type</Label>
                            <Select 
                              value={newCompany.plan_type} 
                              onValueChange={(value) => setNewCompany(prev => ({ ...prev, plan_type: value }))}
                            >
                              <SelectTrigger className="transition-all focus:scale-[1.01]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="basic">
                                  <div className="flex items-center gap-2">
                                    <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
                                    Basic Plan
                                  </div>
                                </SelectItem>
                                <SelectItem value="professional">
                                  <div className="flex items-center gap-2">
                                    <div className="h-2 w-2 bg-purple-500 rounded-full"></div>
                                    Professional Plan
                                  </div>
                                </SelectItem>
                                <SelectItem value="enterprise">
                                  <div className="flex items-center gap-2">
                                    <div className="h-2 w-2 bg-orange-500 rounded-full"></div>
                                    Enterprise Plan
                                  </div>
                                </SelectItem>
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
                              className="transition-all focus:scale-[1.01]"
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
                              className="transition-all focus:scale-[1.01]"
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
                        disabled={isCreatingCompany}
                        className="bg-gradient-primary hover:shadow-glow"
                      >
                        {isCreatingCompany ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Creating...
                          </>
                        ) : (
                          <>
                            <Plus className="h-4 w-4 mr-2" />
                            Create Company
                          </>
                        )}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Navigation Tabs */}
        <div className="bg-white border-b shadow-sm">
          <div className="p-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-4 bg-muted/50 p-1 rounded-xl">
                <TabsTrigger value="overview" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all">
                  <BarChart3 className="h-4 w-4" />
                  <span className="hidden sm:inline">Overview</span>
                </TabsTrigger>
                <TabsTrigger value="companies" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all">
                  <Building2 className="h-4 w-4" />
                  <span className="hidden sm:inline">Companies</span>
                </TabsTrigger>
                <TabsTrigger value="analytics" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all">
                  <TrendingUp className="h-4 w-4" />
                  <span className="hidden sm:inline">Analytics</span>
                </TabsTrigger>
                <TabsTrigger value="system" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all">
                  <Database className="h-4 w-4" />
                  <span className="hidden sm:inline">System</span>
                </TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="mt-6 space-y-6">
                {/* Enhanced Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <Card className="hover:shadow-lg transition-all duration-300 hover:scale-105 border-l-4 border-l-primary">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Total Companies</p>
                          <p className="text-3xl font-bold text-primary">{stats.total_companies}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            <TrendingUp className="h-3 w-3 inline mr-1" />
                            +12% from last month
                          </p>
                        </div>
                        <div className="h-12 w-12 bg-primary/10 rounded-xl flex items-center justify-center">
                          <Building2 className="h-6 w-6 text-primary" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="hover:shadow-lg transition-all duration-300 hover:scale-105 border-l-4 border-l-secondary">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Total Users</p>
                          <p className="text-3xl font-bold text-secondary">{stats.total_users}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            <TrendingUp className="h-3 w-3 inline mr-1" />
                            +8% from last month
                          </p>
                        </div>
                        <div className="h-12 w-12 bg-secondary/10 rounded-xl flex items-center justify-center">
                          <Users className="h-6 w-6 text-secondary" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="hover:shadow-lg transition-all duration-300 hover:scale-105 border-l-4 border-l-success">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Total Vehicles</p>
                          <p className="text-3xl font-bold text-success">{stats.total_vehicles}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            <TrendingUp className="h-3 w-3 inline mr-1" />
                            +15% from last month
                          </p>
                        </div>
                        <div className="h-12 w-12 bg-success/10 rounded-xl flex items-center justify-center">
                          <Truck className="h-6 w-6 text-success" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="hover:shadow-lg transition-all duration-300 hover:scale-105 border-l-4 border-l-warning">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Active Drivers</p>
                          <p className="text-3xl font-bold text-warning">{stats.total_drivers}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            <TrendingUp className="h-3 w-3 inline mr-1" />
                            +5% from last month
                          </p>
                        </div>
                        <div className="h-12 w-12 bg-warning/10 rounded-xl flex items-center justify-center">
                          <Users className="h-6 w-6 text-warning" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* System Status Cards */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <Card className="hover:shadow-lg transition-all duration-300">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Activity className="h-5 w-5 text-green-500" />
                        System Health
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Database</span>
                          <div className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <span className="text-sm">Operational</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">API Services</span>
                          <div className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <span className="text-sm">Operational</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">GPS Tracking</span>
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-yellow-500" />
                            <span className="text-sm">Maintenance</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="hover:shadow-lg transition-all duration-300">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Globe className="h-5 w-5 text-blue-500" />
                        Global Activity
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Active Sessions</span>
                          <span className="text-sm font-medium">1,247</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Vehicles Online</span>
                          <span className="text-sm font-medium">892</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Data Processed</span>
                          <span className="text-sm font-medium">45.2 GB</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="hover:shadow-lg transition-all duration-300">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Clock className="h-5 w-5 text-purple-500" />
                        Recent Activity
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="text-sm">
                          <div className="font-medium">New Company Added</div>
                          <div className="text-muted-foreground">Swift Logistics - 2 min ago</div>
                        </div>
                        <div className="text-sm">
                          <div className="font-medium">System Update</div>
                          <div className="text-muted-foreground">v2.1.3 deployed - 1 hour ago</div>
                        </div>
                        <div className="text-sm">
                          <div className="font-medium">Backup Completed</div>
                          <div className="text-muted-foreground">Daily backup - 3 hours ago</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Companies Tab */}
              <TabsContent value="companies" className="mt-6 space-y-6">
                {/* Search and Filter Bar */}
                <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search companies..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <Filter className="h-4 w-4 mr-2" />
                      Filter
                    </Button>
                    <Button variant="outline" size="sm">
                      Export
                    </Button>
                  </div>
                </div>

                {/* Companies Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                  {companies
                    .filter(company => 
                      company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      company.owner_name.toLowerCase().includes(searchTerm.toLowerCase())
                    )
                    .map((company) => (
                    <Card key={company.id} className="hover:shadow-lg transition-all duration-300 hover:scale-105">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-lg">{company.name}</CardTitle>
                            <CardDescription className="flex items-center gap-1 mt-1">
                              <User className="h-3 w-3" />
                              {company.owner_name}
                            </CardDescription>
                          </div>
                          <Badge 
                            variant={company.status === 'active' ? 'default' : 'secondary'}
                            className={company.status === 'active' ? 'bg-green-100 text-green-800' : ''}
                          >
                            {company.status}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Mail className="h-3 w-3" />
                            {company.email}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            {company.phone}
                          </div>
                          <Separator />
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">Plan:</span>
                              <div className="font-medium capitalize">{company.plan_type}</div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Vehicles:</span>
                              <div className="font-medium">{company.max_vehicles}</div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" className="flex-1">
                              <Eye className="h-3 w-3 mr-2" />
                              View Details
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleEditCompany(company)}
                              className="text-blue-600 hover:text-blue-600 hover:bg-blue-50"
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            {(company.plan_type === 'demo' || company.plan_type === 'trial' || company.plan_type === 'test') && 
                             company.name !== 'SYSTEM_SUPERADMIN' && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                    onClick={() => validateCompanyDeletion(company)}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                                      <Trash2 className="h-5 w-5" />
                                      Delete Test Company
                                    </AlertDialogTitle>
                                    <AlertDialogDescription className="space-y-3">
                                      {deleteValidation ? (
                                        deleteValidation.can_delete ? (
                                          <div className="space-y-3">
                                            <p>You are about to permanently delete the test company:</p>
                                            <div className="bg-muted p-3 rounded-lg">
                                              <p className="font-semibold">{deleteValidation.company_name}</p>
                                              <p className="text-sm text-muted-foreground">
                                                Plan: {deleteValidation.plan_type} | Created: {new Date(deleteValidation.created_at).toLocaleDateString()}
                                              </p>
                                            </div>
                                            <div className="bg-red-50 border border-red-200 p-3 rounded-lg">
                                              <p className="text-sm text-red-800 font-medium mb-2">This will permanently delete:</p>
                                              <ul className="text-sm text-red-700 space-y-1">
                                                <li>• {deleteValidation.data_summary.loads} loads</li>
                                                <li>• {deleteValidation.data_summary.drivers} drivers</li>
                                                <li>• {deleteValidation.data_summary.payment_periods} payment periods</li>
                                                <li>• {deleteValidation.data_summary.fuel_expenses} fuel expenses</li>
                                                <li>• All company documents and settings</li>
                                                <li>• All user accounts associated with this company</li>
                                              </ul>
                                            </div>
                                            <p className="text-sm font-medium text-destructive">
                                              This action cannot be undone!
                                            </p>
                                          </div>
                                        ) : (
                                          <div className="space-y-3">
                                            <p className="text-destructive">This company cannot be deleted:</p>
                                            <div className="bg-red-50 border border-red-200 p-3 rounded-lg">
                                              <p className="text-sm text-red-800 font-medium">
                                                {deleteValidation.reason}
                                              </p>
                                              {deleteValidation.details && (
                                                <div className="mt-2 text-sm text-red-700">
                                                  <p>Company has operational data:</p>
                                                  <ul className="mt-1 space-y-1">
                                                    <li>• {deleteValidation.details.loads} loads</li>
                                                    <li>• {deleteValidation.details.drivers} drivers</li>
                                                    <li>• {deleteValidation.details.payment_periods} payment periods</li>
                                                    <li>• {deleteValidation.details.fuel_expenses} fuel expenses</li>
                                                  </ul>
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        )
                                      ) : (
                                        <p>Validating company deletion...</p>
                                      )}
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel 
                                      onClick={() => {
                                        setCompanyToDelete(null);
                                        setDeleteValidation(null);
                                      }}
                                    >
                                      Cancel
                                    </AlertDialogCancel>
                                    {deleteValidation?.can_delete && (
                                      <AlertDialogAction
                                        onClick={handleDeleteCompany}
                                        disabled={isDeletingCompany}
                                        className="bg-destructive hover:bg-destructive/90"
                                      >
                                        {isDeletingCompany ? (
                                          <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                            Deleting...
                                          </>
                                        ) : (
                                          <>
                                            <Trash2 className="h-4 w-4 mr-2" />
                                            Delete Company
                                          </>
                                        )}
                                      </AlertDialogAction>
                                    )}
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Empty State */}
                {loadingData ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                      <p className="mt-2 text-muted-foreground">Loading companies...</p>
                    </div>
                  </div>
                ) : companies.length === 0 ? (
                  <div className="text-center py-12">
                    <Building2 className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold">No Companies Found</h3>
                    <p className="text-muted-foreground mb-4">Get started by creating your first company.</p>
                    <Button onClick={() => setShowCreateDialog(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create First Company
                    </Button>
                  </div>
                ) : null}
              </TabsContent>

              {/* Edit Company Dialog */}
              <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Edit className="h-5 w-5 text-blue-600" />
                      Edit Company: {companyToEdit?.name}
                    </DialogTitle>
                    <DialogDescription>
                      Modify company information. Payment and regulatory data cannot be changed.
                    </DialogDescription>
                  </DialogHeader>
                  
                  {companyToEdit && (
                    <div className="grid grid-cols-2 gap-6 py-4">
                      {/* Left Column - Basic Info */}
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 pb-2 border-b">
                          <Building2 className="h-4 w-4 text-primary" />
                          <h3 className="font-semibold text-sm text-primary uppercase tracking-wide">
                            Company Information
                          </h3>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="edit-company-name">Company Name *</Label>
                          <Input
                            id="edit-company-name"
                            value={companyToEdit.name}
                            onChange={(e) => setCompanyToEdit(prev => prev ? {...prev, name: e.target.value} : null)}
                            placeholder="Company name"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="edit-company-email">Company Email</Label>
                          <Input
                            id="edit-company-email"
                            type="email"
                            value={companyToEdit.email || ''}
                            onChange={(e) => setCompanyToEdit(prev => prev ? {...prev, email: e.target.value} : null)}
                            placeholder="contact@company.com"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="edit-company-phone">Company Phone</Label>
                          <Input
                            id="edit-company-phone"
                            value={companyToEdit.phone || ''}
                            onChange={(e) => setCompanyToEdit(prev => prev ? {...prev, phone: e.target.value} : null)}
                            placeholder="(555) 123-4567"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="edit-plan-type">Plan Type</Label>
                          <Select 
                            value={companyToEdit.plan_type} 
                            onValueChange={(value) => setCompanyToEdit(prev => prev ? {...prev, plan_type: value} : null)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select plan type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="basic">Basic</SelectItem>
                              <SelectItem value="premium">Premium</SelectItem>
                              <SelectItem value="enterprise">Enterprise</SelectItem>
                              <SelectItem value="demo">Demo</SelectItem>
                              <SelectItem value="trial">Trial</SelectItem>
                              <SelectItem value="test">Test</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <Label htmlFor="edit-max-vehicles">Max Vehicles</Label>
                            <Input
                              id="edit-max-vehicles"
                              type="number"
                              value={companyToEdit.max_vehicles}
                              onChange={(e) => setCompanyToEdit(prev => prev ? {...prev, max_vehicles: parseInt(e.target.value) || 0} : null)}
                              min="1"
                              max="1000"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="edit-max-users">Max Users</Label>
                            <Input
                              id="edit-max-users"
                              type="number"
                              value={companyToEdit.max_users}
                              onChange={(e) => setCompanyToEdit(prev => prev ? {...prev, max_users: parseInt(e.target.value) || 0} : null)}
                              min="1"
                              max="100"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="edit-status">Status</Label>
                          <Select 
                            value={companyToEdit.status} 
                            onValueChange={(value) => setCompanyToEdit(prev => prev ? {...prev, status: value} : null)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="active">Active</SelectItem>
                              <SelectItem value="inactive">Inactive</SelectItem>
                              <SelectItem value="suspended">Suspended</SelectItem>
                              <SelectItem value="archived">Archived</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Right Column - Owner Info */}
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 pb-2 border-b">
                          <User className="h-4 w-4 text-primary" />
                          <h3 className="font-semibold text-sm text-primary uppercase tracking-wide">
                            Owner Information
                          </h3>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="edit-owner-name">Owner Name</Label>
                          <Input
                            id="edit-owner-name"
                            value={companyToEdit.owner_name || ''}
                            onChange={(e) => setCompanyToEdit(prev => prev ? {...prev, owner_name: e.target.value} : null)}
                            placeholder="John Smith"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="edit-owner-email">Owner Email</Label>
                          <Input
                            id="edit-owner-email"
                            type="email"
                            value={companyToEdit.owner_email || ''}
                            onChange={(e) => setCompanyToEdit(prev => prev ? {...prev, owner_email: e.target.value} : null)}
                            placeholder="john@company.com"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="edit-owner-phone">Owner Phone</Label>
                          <Input
                            id="edit-owner-phone"
                            value={companyToEdit.owner_phone || ''}
                            onChange={(e) => setCompanyToEdit(prev => prev ? {...prev, owner_phone: e.target.value} : null)}
                            placeholder="(555) 987-6543"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="edit-owner-title">Owner Title</Label>
                          <Input
                            id="edit-owner-title"
                            value={companyToEdit.owner_title || ''}
                            onChange={(e) => setCompanyToEdit(prev => prev ? {...prev, owner_title: e.target.value} : null)}
                            placeholder="CEO, President, etc."
                          />
                        </div>

                        {/* Protected Information Notice */}
                        <div className="bg-muted p-4 rounded-lg">
                          <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                            <Shield className="h-4 w-4 text-orange-500" />
                            Protected Information
                          </h4>
                          <div className="text-sm text-muted-foreground space-y-1">
                            <p><strong>Payment Configuration:</strong> Cannot be modified by SuperAdmin</p>
                            <p><strong>Regulatory Data:</strong> DOT, MC, EIN numbers are protected</p>
                            <p><strong>System Fields:</strong> ID, creation dates are immutable</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex justify-end gap-3 pt-4 border-t">
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setShowEditDialog(false);
                        setCompanyToEdit(null);
                      }}
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleUpdateCompany}
                      disabled={isUpdatingCompany}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {isUpdatingCompany ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Updating...
                        </>
                      ) : (
                        <>
                          <Edit className="h-4 w-4 mr-2" />
                          Update Company
                        </>
                      )}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              {/* Analytics Tab */}
              <TabsContent value="analytics" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      Analytics Dashboard
                    </CardTitle>
                    <CardDescription>
                      Comprehensive system analytics and performance metrics
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-12">
                      <BarChart3 className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold">Analytics Coming Soon</h3>
                      <p className="text-muted-foreground">
                        Advanced analytics and reporting features will be available here.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* System Tab */}
              <TabsContent value="system" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Database className="h-5 w-5" />
                      System Management
                    </CardTitle>
                    <CardDescription>
                      System configuration and maintenance tools
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-12">
                      <Settings className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold">System Tools Coming Soon</h3>
                      <p className="text-muted-foreground">
                        Advanced system management features will be available here.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </Layout>
  );
}