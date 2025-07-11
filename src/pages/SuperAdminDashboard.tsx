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
import { createTextHandlers, handlePhoneInput } from '@/lib/textUtils';
import { useTranslation } from 'react-i18next';
import { useSuperAdminDashboard } from '@/hooks/useSuperAdminDashboard';

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
  const { t, i18n } = useTranslation(['admin', 'common']);
  const { user, isSuperAdmin, loading } = useAuth();
  const { toast } = useToast();
  const { showSuccess, showError } = useFleetNotifications();

  // Debug logs removed for performance optimization
  const [activeTab, setActiveTab] = useState('overview');
  
  // Use optimized dashboard hook
  const { 
    stats, 
    companies, 
    loadingData, 
    fetchSystemStats, 
    fetchCompanies, 
    initializeDashboard 
  } = useSuperAdminDashboard();
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
  
  const [companyToView, setCompanyToView] = useState<Company | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);

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

  // Create text handlers for edit form fields
  const editOwnerPhoneHandlers = createTextHandlers((value) => 
    setCompanyToEdit(prev => prev ? {...prev, owner_phone: value} : null), 'phone'
  );
  
  const editCompanyPhoneHandlers = createTextHandlers((value) => 
    setCompanyToEdit(prev => prev ? {...prev, phone: value} : null), 'phone'
  );

  // Handler for auto-fill format detection
  const handleAutoFillFormat = (
    currentValue: string, 
    setValue: (value: string) => void,
    type: 'phone' | 'email' = 'phone'
  ) => {
    if (type === 'phone' && currentValue && !currentValue.includes('(')) {
      // If it's a phone number without formatting, apply formatting
      const formattedValue = handlePhoneInput(currentValue);
      setValue(formattedValue);
    }
  };

  useEffect(() => {
    if (!loading && isSuperAdmin) {
      initializeDashboard();
    }
  }, [loading, isSuperAdmin, initializeDashboard]);

  const handleCreateCompany = async () => {
    setIsCreatingCompany(true);
    try {
      const { data, error } = await supabase
        .from('companies')
        .insert([{
          ...newCompany,
          // Campos obligatorios temporales para que funcione la inserción
          street_address: '',
          state_id: 'TX',
          zip_code: '',
          status: 'active',
          contract_start_date: new Date().toISOString().split('T')[0],
        }])
        .select()
        .single();

      if (error) throw error;

      showSuccess(
        t('admin:pages.companies.messages.company_created_success'),
        `${newCompany.name} ${t('admin:pages.companies.messages.company_created_desc')}`
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
        initializeDashboard();
    } catch (error: any) {
      console.error('Error creating company:', error);
      showError(
        t('admin:pages.companies.messages.company_creation_error'),
        error.message || t('admin:pages.companies.messages.company_creation_error_desc')
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
        initializeDashboard();
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

  const handleViewDetails = (company: Company) => {
    setCompanyToView(company);
    setShowDetailsDialog(true);
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
          street_address: companyToEdit.street_address || '',
          state_id: companyToEdit.state_id || 'TX',
          zip_code: companyToEdit.zip_code || '',
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
              <p className="mt-2 text-muted-foreground">{t('admin:common.loading')}</p>
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
                <h2 className="text-lg font-semibold text-destructive">{t('admin:common.access_denied')}</h2>
                <p className="text-muted-foreground">{t('admin:common.access_denied_message')}</p>
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
                    {t('admin:pages.superadmin.header.control_center')}
                  </h1>
                  <p className="text-white font-body text-lg">{t('admin:pages.superadmin.header.global_admin')}</p>
                </div>
                
                <div className="flex items-center gap-4 animate-fade-in" style={{animationDelay: '0.1s'}}>
                  <Badge variant="secondary" className="bg-white text-primary border-0 hover:bg-white/90 transition-colors font-semibold">
                    <Shield className="h-3 w-3 mr-1" />
                    {t('admin:pages.superadmin.header.system_administrator')}
                  </Badge>
                  <div className="flex items-center gap-2 text-white">
                    <div className="h-2 w-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-sm font-medium">{t('admin:pages.superadmin.header.system_status')}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-3 animate-fade-in" style={{animationDelay: '0.2s'}}>
                <Button 
                  variant="outline" 
                  className="bg-white/10 border-white text-white hover:bg-white hover:text-primary transition-all hover:scale-105 font-medium"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  {t('admin:pages.superadmin.header.system_settings')}
                </Button>
                <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                  <DialogTrigger asChild>
                    <Button className="bg-gradient-primary hover:shadow-glow transition-all hover:scale-105">
                      <Plus className="h-4 w-4 mr-2" />
                      {t('admin:pages.superadmin.header.new_company')}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <Building2 className="h-5 w-5 text-primary" />
                        {t('admin:pages.superadmin.dialogs.create_company')}
                      </DialogTitle>
                      <DialogDescription>
                        {t('admin:pages.superadmin.dialogs.create_company_desc')}
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="grid grid-cols-2 gap-6 py-4">
                      {/* Company Information */}
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 pb-2 border-b">
                          <Building2 className="h-4 w-4 text-primary" />
                          <h3 className="font-semibold text-sm text-primary uppercase tracking-wide">
                            {t('admin:pages.companies.form_labels.company_information')}
                          </h3>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="company-name">{t('admin:pages.companies.form_labels.company_name')} *</Label>
                          <Input
                            id="company-name"
                            value={newCompany.name}
                            {...companyNameHandlers}
                            placeholder="Swift Transportation"
                            className="transition-all focus:scale-[1.01]"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="company-email">{t('admin:common.company_email')} *</Label>
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
                          <Label htmlFor="company-phone">{t('admin:common.company_phone')} *</Label>
                          <div className="relative">
                            <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                              id="company-phone"
                              value={newCompany.phone}
                              {...companyPhoneHandlers}
                              onBlur={(e) => {
                                companyPhoneHandlers.onBlur?.(e);
                                handleAutoFillFormat(e.target.value, (value) => 
                                  setNewCompany(prev => ({ ...prev, phone: value })), 'phone'
                                );
                              }}
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
                            {t('admin:common.owner_primary_contact')}
                          </h3>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="owner-name">{t('admin:common.owner_name')} *</Label>
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
                          <Label htmlFor="owner-email">{t('admin:common.owner_email')} *</Label>
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
                          <Label htmlFor="owner-phone">{t('admin:common.owner_phone')} *</Label>
                          <div className="relative">
                            <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                              id="owner-phone"
                              value={newCompany.owner_phone}
                              {...ownerPhoneHandlers}
                              onBlur={(e) => {
                                ownerPhoneHandlers.onBlur?.(e);
                                handleAutoFillFormat(e.target.value, (value) => 
                                  setNewCompany(prev => ({ ...prev, owner_phone: value })), 'phone'
                                );
                              }}
                              placeholder="(555) 987-6543"
                              className="pl-10 transition-all focus:scale-[1.01]"
                            />
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="owner-title">{t('admin:common.owner_title')}</Label>
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
                        {t('admin:common.cancel')}
                      </Button>
                      <Button 
                        onClick={handleCreateCompany}
                        disabled={isCreatingCompany}
                        className="bg-gradient-primary hover:shadow-glow"
                      >
                        {isCreatingCompany ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            {t('admin:common.creating')}
                          </>
                        ) : (
                          <>
                            <Plus className="h-4 w-4 mr-2" />
                            {t('admin:pages.companies.buttons.create_company')}
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
                  <span className="hidden sm:inline">{t('admin:common.overview')}</span>
                </TabsTrigger>
                <TabsTrigger value="companies" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all">
                  <Building2 className="h-4 w-4" />
                  <span className="hidden sm:inline">{t('admin:navigation.companies')} {/* DEBUG: companies tab */}</span>
                </TabsTrigger>
                <TabsTrigger value="analytics" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all">
                  <TrendingUp className="h-4 w-4" />
                  <span className="hidden sm:inline">{t('admin:common.analytics')}</span>
                </TabsTrigger>
                <TabsTrigger value="system" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all">
                  <Database className="h-4 w-4" />
                  <span className="hidden sm:inline">{t('admin:common.system')}</span>
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
                          <p className="text-sm font-medium text-muted-foreground">{t('admin:common.total_companies')}</p>
                          <p className="text-3xl font-bold text-primary">{stats.total_companies}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            <TrendingUp className="h-3 w-3 inline mr-1" />
                            {t('admin:common.from_last_month')}
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
                          <p className="text-sm font-medium text-muted-foreground">{t('admin:common.total_users')}</p>
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
                          <p className="text-sm font-medium text-muted-foreground">{t('admin:common.total_vehicles')}</p>
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
                          <p className="text-sm font-medium text-muted-foreground">{t('admin:common.total_drivers')}</p>
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
                        {t('admin:common.system_health')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Database</span>
                          <div className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <span className="text-sm">{t('admin:common.operational')}</span>
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
                        {t('admin:common.global_activity')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">{t('admin:common.active_sessions')}</span>
                          <span className="text-sm font-medium">1,247</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">{t('admin:common.vehicles_online')}</span>
                          <span className="text-sm font-medium">892</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">{t('admin:common.data_processed')}</span>
                          <span className="text-sm font-medium">45.2 GB</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="hover:shadow-lg transition-all duration-300">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Clock className="h-5 w-5 text-purple-500" />
                        {t('admin:common.recent_activity')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="text-sm">
                          <div className="font-medium">{t('common.new_company_added')}</div>
                          <div className="text-muted-foreground">Swift Logistics - 2 {t('common.min_ago')}</div>
                        </div>
                        <div className="text-sm">
                          <div className="font-medium">{t('common.system_update')}</div>
                          <div className="text-muted-foreground">v2.1.3 {t('common.deployed')} - 1 {t('common.hour_ago')}</div>
                        </div>
                        <div className="text-sm">
                          <div className="font-medium">{t('common.backup_completed')}</div>
                          <div className="text-muted-foreground">{t('common.daily_backup')} - 3 {t('common.hours_ago')}</div>
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
                      placeholder={t('admin:common.search_companies')}
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
                              <span className="text-muted-foreground">{t('admin:common.plan')}:</span>
                              <div className="font-medium capitalize">{company.plan_type}</div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">{t('admin:common.vehicles')}:</span>
                              <div className="font-medium">{company.max_vehicles}</div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="flex-1"
                              onClick={() => handleViewDetails(company)}
                            >
                              <Eye className="h-3 w-3 mr-2" />
                              {t('admin:common.view_details')}
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
                                      {t('admin:common.delete_test_company')}
                                    </AlertDialogTitle>
                                    <AlertDialogDescription className="space-y-3">
                                      {deleteValidation ? (
                                        deleteValidation.can_delete ? (
                                          <div className="space-y-3">
                                             <p>{t('admin:common.permanently_delete')}</p>
                                             <div className="bg-muted p-3 rounded-lg">
                                               <p className="font-semibold">{deleteValidation.company_name}</p>
                                               <p className="text-sm text-muted-foreground">
                                                 {t('admin:common.plan')}: {deleteValidation.plan_type} | {t('admin:common.created')}: {new Date(deleteValidation.created_at).toLocaleDateString()}
                                               </p>
                                             </div>
                                             <div className="bg-red-50 border border-red-200 p-3 rounded-lg">
                                               <p className="text-sm text-red-800 font-medium mb-2">{t('admin:common.permanently_delete_warning')}</p>
                                               <ul className="text-sm text-red-700 space-y-1">
                                                 <li>• {deleteValidation.data_summary.loads} {t('admin:common.loads')}</li>
                                                 <li>• {deleteValidation.data_summary.drivers} {t('admin:common.drivers')}</li>
                                                 <li>• {deleteValidation.data_summary.payment_periods} {t('admin:common.payment_periods')}</li>
                                                 <li>• {deleteValidation.data_summary.fuel_expenses} {t('admin:common.fuel_expenses')}</li>
                                                 <li>• {t('admin:common.company_documents')}</li>
                                                 <li>• {t('admin:common.user_accounts')}</li>
                                               </ul>
                                             </div>
                                             <p className="text-sm font-medium text-destructive">
                                               {t('admin:common.action_cannot_undone')}
                                            </p>
                                          </div>
                                        ) : (
                                          <div className="space-y-3">
                                             <p className="text-destructive">{t('admin:common.cannot_delete')}</p>
                                             <div className="bg-red-50 border border-red-200 p-3 rounded-lg">
                                               <p className="text-sm text-red-800 font-medium">
                                                 {deleteValidation.reason}
                                               </p>
                                               {deleteValidation.details && (
                                                 <div className="mt-2 text-sm text-red-700">
                                                   <p>{t('admin:common.operational_data')}</p>
                                                   <ul className="mt-1 space-y-1">
                                                     <li>• {deleteValidation.details.loads} {t('admin:common.loads')}</li>
                                                     <li>• {deleteValidation.details.drivers} {t('admin:common.drivers')}</li>
                                                     <li>• {deleteValidation.details.payment_periods} {t('admin:common.payment_periods')}</li>
                                                     <li>• {deleteValidation.details.fuel_expenses} {t('admin:common.fuel_expenses')}</li>
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
                                     {t('admin:common.cancel')}
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
                                            {t('admin:common.delete')}...
                                          </>
                                        ) : (
                                          <>
                                            <Trash2 className="h-4 w-4 mr-2" />
                                            {t('admin:common.permanently_delete_button')}
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
                      <p className="mt-2 text-muted-foreground">{t('admin:common.loading')}</p>
                    </div>
                  </div>
                ) : companies.length === 0 ? (
                  <div className="text-center py-12">
                    <Building2 className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold">{t('admin:common.no_companies')}</h3>
                    <p className="text-muted-foreground mb-4">Get started by creating your first company.</p>
                    <Button onClick={() => setShowCreateDialog(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      {t('admin:pages.companies.buttons.create_company')}
                    </Button>
                  </div>
                ) : null}
              </TabsContent>

              {/* View Details Dialog */}
              <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Eye className="h-5 w-5 text-primary" />
                      Company Details: {companyToView?.name}
                    </DialogTitle>
                    <DialogDescription>
                      Complete information about this company in the FleetNest system.
                    </DialogDescription>
                  </DialogHeader>
                  
                  {companyToView && (
                    <div className="grid grid-cols-2 gap-6 py-4">
                      {/* Left Column - Company & Contact Info */}
                      <div className="space-y-6">
                        {/* Basic Company Information */}
                        <div className="space-y-4">
                          <div className="flex items-center gap-2 pb-2 border-b">
                            <Building2 className="h-4 w-4 text-primary" />
                            <h3 className="font-semibold text-sm text-primary uppercase tracking-wide">
                              {t('admin:pages.companies.form_labels.company_information')}
                            </h3>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                {t('admin:pages.companies.form_labels.company_name')}
                              </Label>
                              <p className="font-semibold">{companyToView.name}</p>
                            </div>
                            <div>
                              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                {t('admin:common.status')}
                              </Label>
                              <Badge 
                                variant={
                                  companyToView.status === 'active' ? 'default' : 
                                  companyToView.status === 'suspended' ? 'destructive' : 'secondary'
                                }
                                className="mt-1"
                              >
                                {companyToView.status}
                              </Badge>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 gap-4">
                            <div>
                              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                Email
                              </Label>
                              <div className="flex items-center gap-2 mt-1">
                                <Mail className="h-4 w-4 text-muted-foreground" />
                                <p>{companyToView.email || 'Not provided'}</p>
                              </div>
                            </div>
                            <div>
                              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                Phone
                              </Label>
                              <div className="flex items-center gap-2 mt-1">
                                <Phone className="h-4 w-4 text-muted-foreground" />
                                <p>{companyToView.phone || 'Not provided'}</p>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Owner Information */}
                        <div className="space-y-4">
                          <div className="flex items-center gap-2 pb-2 border-b">
                            <User className="h-4 w-4 text-primary" />
                            <h3 className="font-semibold text-sm text-primary uppercase tracking-wide">
                              Owner Information
                            </h3>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                {t('common.name')}
                              </Label>
                              <p className="font-medium">{companyToView.owner_name || t('common.not_provided')}</p>
                            </div>
                            <div>
                              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                {t('common.title')}
                              </Label>
                              <p className="font-medium">{companyToView.owner_title || t('common.not_provided')}</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 gap-4">
                            <div>
                              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                {t('common.email')}
                              </Label>
                              <div className="flex items-center gap-2 mt-1">
                                <Mail className="h-4 w-4 text-muted-foreground" />
                                <p>{companyToView.owner_email || t('common.not_provided')}</p>
                              </div>
                            </div>
                            <div>
                              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                {t('common.phone')}
                              </Label>
                              <div className="flex items-center gap-2 mt-1">
                                <Phone className="h-4 w-4 text-muted-foreground" />
                                <p>{companyToView.owner_phone || t('common.not_provided')}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Right Column - Plan & System Info */}
                      <div className="space-y-6">
                        {/* Plan & Limits */}
                        <div className="space-y-4">
                          <div className="flex items-center gap-2 pb-2 border-b">
                            <Briefcase className="h-4 w-4 text-primary" />
                            <h3 className="font-semibold text-sm text-primary uppercase tracking-wide">
                              {t('common.plan_configuration')}
                            </h3>
                          </div>
                          
                          <div className="grid grid-cols-1 gap-4">
                            <div>
                              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                {t('common.plan_type')}
                              </Label>
                              <Badge 
                                variant={companyToView.plan_type === 'enterprise' ? 'default' : 'secondary'}
                                className="mt-1 capitalize"
                              >
                                {companyToView.plan_type}
                              </Badge>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                  {t('common.max_vehicles')}
                                </Label>
                                <div className="flex items-center gap-2 mt-1">
                                  <Truck className="h-4 w-4 text-muted-foreground" />
                                  <p className="font-semibold text-lg">{companyToView.max_vehicles}</p>
                                </div>
                              </div>
                              <div>
                                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                  {t('common.max_users')}
                                </Label>
                                <div className="flex items-center gap-2 mt-1">
                                  <Users className="h-4 w-4 text-muted-foreground" />
                                  <p className="font-semibold text-lg">{companyToView.max_users}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* System Information */}
                        <div className="space-y-4">
                          <div className="flex items-center gap-2 pb-2 border-b">
                            <Database className="h-4 w-4 text-primary" />
                            <h3 className="font-semibold text-sm text-primary uppercase tracking-wide">
                              System Information
                            </h3>
                          </div>
                          
                          <div className="grid grid-cols-1 gap-4">
                            <div>
                              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                Company ID
                              </Label>
                              <p className="font-mono text-sm bg-muted p-2 rounded border">{companyToView.id}</p>
                            </div>
                            <div>
                              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                {t('common.company_created')}
                              </Label>
                              <div className="flex items-center gap-2 mt-1">
                                <Clock className="h-4 w-4 text-muted-foreground" />
                                <p>{new Date(companyToView.created_at).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}</p>
                              </div>
                            </div>
                            {companyToView.contract_start_date && (
                              <div>
                                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                  {t('common.contract_start')}
                                </Label>
                                <div className="flex items-center gap-2 mt-1">
                                  <CheckCircle className="h-4 w-4 text-green-600" />
                                  <p>{new Date(companyToView.contract_start_date).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                  })}</p>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Protected Information Notice */}
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                          <div className="flex items-start gap-2">
                            <Shield className="h-4 w-4 text-amber-600 mt-0.5" />
                            <div>
                              <h4 className="text-sm font-medium text-amber-800">Protected Information</h4>
                              <p className="text-sm text-amber-700 mt-1">
                                Payment settings, regulatory data (DOT, MC, EIN), and address information 
                                are protected and only visible to authorized personnel.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </DialogContent>
              </Dialog>

              {/* Edit Company Dialog */}
              <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Edit className="h-5 w-5 text-blue-600" />
                      {t('admin:common.edit_company')}: {companyToEdit?.name}
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
                            {t('admin:pages.companies.form_labels.company_information')}
                          </h3>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="edit-company-name">{t('admin:pages.companies.form_labels.company_name')} *</Label>
                          <Input
                            id="edit-company-name"
                            value={companyToEdit.name}
                            onChange={(e) => setCompanyToEdit(prev => prev ? {...prev, name: e.target.value} : null)}
                            placeholder="Company name"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="edit-company-email">{t('admin:pages.companies.form_labels.company_email')}</Label>
                          <Input
                            id="edit-company-email"
                            type="email"
                            value={companyToEdit.email || ''}
                            onChange={(e) => setCompanyToEdit(prev => prev ? {...prev, email: e.target.value} : null)}
                            placeholder="contact@company.com"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="edit-company-phone">{t('admin:pages.companies.form_labels.company_phone')}</Label>
                          <div className="relative">
                            <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                              id="edit-company-phone"
                              value={companyToEdit.phone || ''}
                              {...editCompanyPhoneHandlers}
                              onBlur={(e) => {
                                editCompanyPhoneHandlers.onBlur?.(e);
                                handleAutoFillFormat(e.target.value, (value) => 
                                  setCompanyToEdit(prev => prev ? {...prev, phone: value} : null), 'phone'
                                );
                              }}
                              placeholder="(555) 123-4567"
                              className="pl-10"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="edit-plan-type">{t('common.plan_type')}</Label>
                          <Select 
                            value={companyToEdit.plan_type} 
                            onValueChange={(value) => setCompanyToEdit(prev => prev ? {...prev, plan_type: value} : null)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder={t('admin:pages.companies.form.plan_type')} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="basic">{t('admin:pages.companies.plans.basic')}</SelectItem>
                              <SelectItem value="premium">{t('admin:pages.companies.plans.premium')}</SelectItem>
                              <SelectItem value="enterprise">{t('admin:pages.companies.plans.enterprise')}</SelectItem>
                              <SelectItem value="demo">{t('admin:pages.companies.plans.demo')}</SelectItem>
                              <SelectItem value="trial">{t('admin:pages.companies.plans.trial')}</SelectItem>
                              <SelectItem value="test">Test</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <Label htmlFor="edit-max-vehicles">{t('common.max_vehicles')}</Label>
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
                            <Label htmlFor="edit-max-users">{t('common.max_users')}</Label>
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
                          <Label htmlFor="edit-status">{t('common.status')}</Label>
                          <Select 
                            value={companyToEdit.status} 
                            onValueChange={(value) => setCompanyToEdit(prev => prev ? {...prev, status: value} : null)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder={t('admin:pages.companies.form.status')} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="active">{t('admin:pages.companies.status.active')}</SelectItem>
                              <SelectItem value="inactive">{t('admin:pages.companies.status.inactive')}</SelectItem>
                              <SelectItem value="suspended">{t('admin:pages.companies.status.suspended')}</SelectItem>
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
                            {t('common.owner_primary_contact')}
                          </h3>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="edit-owner-name">{t('common.owner_name')}</Label>
                          <Input
                            id="edit-owner-name"
                            value={companyToEdit.owner_name || ''}
                            onChange={(e) => setCompanyToEdit(prev => prev ? {...prev, owner_name: e.target.value} : null)}
                            placeholder="John Smith"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="edit-owner-email">{t('common.owner_email')}</Label>
                          <Input
                            id="edit-owner-email"
                            type="email"
                            value={companyToEdit.owner_email || ''}
                            onChange={(e) => setCompanyToEdit(prev => prev ? {...prev, owner_email: e.target.value} : null)}
                            placeholder="john@company.com"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="edit-owner-phone">{t('common.owner_phone')}</Label>
                          <div className="relative">
                            <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                              id="edit-owner-phone"
                              value={companyToEdit.owner_phone || ''}
                              {...editOwnerPhoneHandlers}
                              onBlur={(e) => {
                                editOwnerPhoneHandlers.onBlur?.(e);
                                handleAutoFillFormat(e.target.value, (value) => 
                                  setCompanyToEdit(prev => prev ? {...prev, owner_phone: value} : null), 'phone'
                                );
                              }}
                              placeholder="(555) 987-6543"
                              className="pl-10"
                            />
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="edit-owner-title">{t('common.owner_title')}</Label>
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
                      {t('common.cancel')}
                    </Button>
                    <Button 
                      onClick={handleUpdateCompany}
                      disabled={isUpdatingCompany}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {isUpdatingCompany ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          {t('common.updating')}
                        </>
                      ) : (
                        <>
                          <Edit className="h-4 w-4 mr-2" />
                          {t('common.update_company')}
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
                    <div className="space-y-6">
                      {/* Placeholder for system tools */}
                      <div className="border rounded-lg p-6 opacity-50">
                        <div className="flex items-center gap-2 mb-4">
                          <Settings className="h-5 w-5 text-muted-foreground" />
                          <h3 className="text-lg font-semibold text-muted-foreground">Otras Herramientas del Sistema</h3>
                        </div>
                        <p className="text-muted-foreground">
                          Herramientas adicionales de administración del sistema estarán disponibles aquí.
                        </p>
                      </div>
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