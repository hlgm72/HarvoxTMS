import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, Plus, Phone, Mail, User, MapPin, Search, Edit, Trash2, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useFleetNotifications } from "@/components/notifications";
import { createTextHandlers } from "@/lib/textUtils";
import { useTranslation } from 'react-i18next';
import { Company } from '@/types/company';
import { StateCombobox } from "@/components/ui/StateCombobox";

// Import new components
import { CompanyStats } from "@/components/companies/CompanyStats";
import { CompanyFilters } from "@/components/companies/CompanyFilters";
import { CompanyViewToggle, ViewMode } from "@/components/companies/CompanyViewToggle";
import { CompanyTableView } from "@/components/companies/CompanyTableView";
import { CompanyCardsView } from "@/components/companies/CompanyCardsView";
import { CompanyListView } from "@/components/companies/CompanyListView";
import { CompanyDashboardView } from "@/components/companies/CompanyDashboardView";
import { CompanyActions } from "@/components/companies/CompanyActions";
import { CompanyPagination } from "@/components/companies/CompanyPagination";

// Using the Company interface from types/company.ts

interface CompanyFormData {
  name: string;
  phone: string;
  email: string;
  street_address: string;
  state_id: string;
  zip_code: string;
  plan_type: string;
  owner_name: string;
  owner_phone: string;
  owner_email: string;
  owner_title: string;
  max_users: number;
  max_vehicles: number;
}

type SortField = 'name' | 'owner_name' | 'plan_type' | 'status' | 'created_at';
type SortDirection = 'asc' | 'desc';

export default function Companies() {
  const { t } = useTranslation(['admin', 'common']);
  
  // Basic state
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [companyToEdit, setCompanyToEdit] = useState<Company | null>(null);
  const [formData, setFormData] = useState<CompanyFormData>({
    name: "",
    phone: "",
    email: "",
    street_address: "",
    state_id: "",
    zip_code: "",
    plan_type: "basic",
    owner_name: "",
    owner_phone: "",
    owner_email: "",
    owner_title: "",
    max_users: 5,
    max_vehicles: 10,
  });

  // New state for enhanced functionality
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [planFilter, setPlanFilter] = useState("all");
  const [stateFilter, setStateFilter] = useState("all");
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const { showSuccess, showError } = useFleetNotifications();

  // Text handlers for phone formatting
  const phoneHandlers = createTextHandlers((value) =>
    setFormData(prev => ({ ...prev, phone: value })), 'phone'
  );
  const ownerPhoneHandlers = createTextHandlers((value) =>
    setFormData(prev => ({ ...prev, owner_phone: value })), 'phone'
  );

  // Auto-fill format detection handler
  const handleAutoFillFormat = (value: string, setter: (value: string) => void, type: 'phone') => {
    if (type === 'phone' && value && !value.includes('(') && value.replace(/\D/g, '').length === 10) {
      const digits = value.replace(/\D/g, '');
      const formatted = `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
      setter(formatted);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  // Filtered and sorted companies
  const processedCompanies = useMemo(() => {
    let filtered = companies.filter(company => {
      const matchesSearch =
        company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (company.owner_name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (company.email?.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesStatus = statusFilter === "all" || company.status === statusFilter;
      const matchesPlan = planFilter === "all" || company.plan_type === planFilter;
      const matchesState = stateFilter === "all" || company.state_id === stateFilter;

      return matchesSearch && matchesStatus && matchesPlan && matchesState;
    });

    // Sort
    filtered.sort((a, b) => {
      let aValue: any = a[sortField];
      let bValue: any = b[sortField];

      if (sortField === 'created_at') {
        aValue = new Date(aValue);
        bValue = new Date(bValue);
      } else {
        aValue = aValue?.toString().toLowerCase() || '';
        bValue = bValue?.toString().toLowerCase() || '';
      }

      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  }, [companies, searchTerm, statusFilter, planFilter, stateFilter, sortField, sortDirection]);

  // Paginated companies
  const paginatedCompanies = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return processedCompanies.slice(startIndex, endIndex);
  }, [processedCompanies, currentPage, pageSize]);

  const totalPages = Math.ceil(processedCompanies.length / pageSize);

  const fetchCompanies = async () => {
    try {
      const { data, error } = await supabase
        .rpc('get_companies_financial_data')
        .then(result => ({
          data: result.data || [],
          error: result.error
        }));

      if (error) throw error;
      setCompanies(data || []);
    } catch (error) {
      console.error('Error fetching companies:', error);
      showError(
        t('admin:common.error'),
        t('admin:pages.companies.messages.load_error', { defaultValue: "Could not load companies" })
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCompany = async () => {
    try {
      const { error } = await supabase
        .rpc('create_or_update_company_with_validation', {
          company_data: formData as any
        });

      if (error) throw error;

      showSuccess(
        t('admin:pages.companies.messages.company_created_success'),
        t('admin:pages.companies.messages.company_created_desc')
      );

      setIsCreateDialogOpen(false);
      resetForm();
      fetchCompanies();
    } catch (error) {
      console.error('Error creating company:', error);
      showError(
        t('admin:pages.companies.messages.company_creation_error'),
        t('admin:pages.companies.messages.company_creation_error_desc')
      );
    }
  };

  const handleEditCompany = async () => {
    if (!companyToEdit) return;

    try {
      const { error } = await supabase
        .rpc('create_or_update_company_with_validation', {
          company_data: formData as any,
          target_company_id: companyToEdit.id
        });

      if (error) throw error;

      showSuccess(
        t('admin:common.company_updated'),
        t('admin:pages.companies.messages.company_updated_desc', { defaultValue: "Company updated successfully" })
      );

      setIsEditDialogOpen(false);
      setCompanyToEdit(null);
      resetForm();
      fetchCompanies();
    } catch (error) {
      console.error('Error updating company:', error);
      showError(
        t('admin:common.error'),
        t('admin:pages.companies.messages.company_update_error', { defaultValue: "Could not update company" })
      );
    }
  };

  const handleDeleteCompany = async (companyId: string, companyName: string) => {
    try {
      // First check if company can be deleted
      const { data: canDeleteResult, error: checkError } = await supabase
        .rpc('can_delete_test_company', { company_id_param: companyId });

      if (checkError) throw checkError;

      const result = canDeleteResult as any;
      if (!result?.can_delete) {
        showError(
          t('admin:common.cannot_delete'),
          result?.reason || t('admin:pages.companies.messages.cannot_delete_desc', { defaultValue: "This company cannot be deleted" })
        );
        return;
      }

      // Proceed with deletion
      const { error } = await supabase
        .rpc('delete_test_company', { company_id_param: companyId });

      if (error) throw error;

      showSuccess(
        t('admin:common.success', { defaultValue: "Success" }),
        t('admin:pages.companies.messages.company_deleted_success', { companyName, defaultValue: `Company "${companyName}" deleted successfully` })
      );

      fetchCompanies();
    } catch (error) {
      console.error('Error deleting company:', error);
      showError(
        t('admin:common.error'),
        t('admin:pages.companies.messages.company_delete_error', { defaultValue: "Could not delete company" })
      );
    }
  };

  const handleBulkStatusChange = async (newStatus: string) => {
    try {
      // Use RPC to update company status for each selected company
      const updatePromises = selectedCompanies.map(companyId =>
        supabase.rpc('create_or_update_company_with_validation', {
          company_data: { status: newStatus },
          target_company_id: companyId
        })
      );
      
      const results = await Promise.all(updatePromises);
      const errors = results.filter(result => result.error);
      
      if (errors.length > 0) {
        throw new Error(`Failed to update ${errors.length} companies`);
      }

      showSuccess(
        t('admin:common.success', { defaultValue: "Success" }),
        t('admin:pages.companies.messages.bulk_status_updated', { count: selectedCompanies.length, defaultValue: `Status updated for ${selectedCompanies.length} companies` })
      );

      fetchCompanies();
    } catch (error) {
      console.error('Error updating company status:', error);
      showError(
        t('admin:common.error'),
        t('admin:pages.companies.messages.bulk_status_error', { defaultValue: "Could not update company status" })
      );
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      phone: "",
      email: "",
      street_address: "",
      state_id: "",
      zip_code: "",
      plan_type: "basic",
      owner_name: "",
      owner_phone: "",
      owner_email: "",
      owner_title: "",
      max_users: 5,
      max_vehicles: 10,
    });
  };

  const openEditDialog = (company: Company) => {
    setCompanyToEdit(company);
    setFormData({
      name: company.name,
      phone: company.phone || "",
      email: company.email || "",
      street_address: company.street_address,
      state_id: company.state_id,
      zip_code: company.zip_code,
      plan_type: company.plan_type || "basic",
      owner_name: company.owner_name || "",
      owner_phone: company.owner_phone || "",
      owner_email: company.owner_email || "",
      owner_title: company.owner_title || "",
      max_users: company.max_users || 5,
      max_vehicles: company.max_vehicles || 10,
    });
    setIsEditDialogOpen(true);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setPlanFilter("all");
    setStateFilter("all");
  };

  const hasActiveFilters = Boolean(searchTerm || statusFilter !== "all" || planFilter !== "all" || stateFilter !== "all");

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="h-10 bg-muted rounded"></div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold tracking-tight flex items-center gap-2">
            <Building2 className="h-8 w-8" />
            {t('admin:pages.companies.title')}
          </h1>
          <p className="text-muted-foreground">
            {t('admin:pages.companies.description')}
          </p>
        </div>

        <div className="flex items-center gap-4">
          <CompanyViewToggle 
            currentView={viewMode} 
            onViewChange={setViewMode} 
          />
          
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                {t('admin:pages.companies.actions.add_company')}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{t('admin:pages.superadmin.dialogs.create_company')}</DialogTitle>
                <DialogDescription>
                  {t('admin:pages.superadmin.dialogs.create_company_desc')}
                </DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Company Information */}
                <div className="space-y-4">
                  <h3 className="font-semibold">{t('admin:pages.companies.form_labels.company_information')}</h3>
                  
                  <div className="space-y-2">
                    <Label htmlFor="name">{t('admin:pages.companies.form_labels.company_name')} *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder={t('admin:pages.companies.placeholders.company_name')}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">{t('admin:pages.companies.form_labels.company_phone')}</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="phone"
                        {...phoneHandlers}
                        onBlur={(e) => {
                          phoneHandlers.onBlur?.(e);
                          handleAutoFillFormat(e.target.value, (value) => 
                            setFormData(prev => ({ ...prev, phone: value })), 'phone'
                          );
                        }}
                        placeholder={t('admin:pages.companies.placeholders.company_phone')}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">{t('admin:pages.companies.form_labels.company_email')}</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                        placeholder={t('admin:pages.companies.placeholders.company_email')}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="street_address">{t('admin:common.address')} *</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="street_address"
                        value={formData.street_address}
                        onChange={(e) => setFormData(prev => ({ ...prev, street_address: e.target.value }))}
                        placeholder="123 Main Street"
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-2">
                      <Label htmlFor="state_id">{t('admin:pages.companies.form.state')} *</Label>
                      <StateCombobox
                        value={formData.state_id}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, state_id: value || '' }))}
                        placeholder="Selecciona estado..."
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="zip_code">{t('admin:pages.companies.form.zip_code')} *</Label>
                      <Input
                        id="zip_code"
                        value={formData.zip_code}
                        onChange={(e) => setFormData(prev => ({ ...prev, zip_code: e.target.value }))}
                        placeholder="12345"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="plan_type">{t('admin:pages.companies.form_labels.plan_type')}</Label>
                    <Select value={formData.plan_type} onValueChange={(value) => setFormData(prev => ({ ...prev, plan_type: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="trial">{t('admin:pages.companies.plans.trial')}</SelectItem>
                        <SelectItem value="basic">{t('admin:pages.companies.plans.basic')}</SelectItem>
                        <SelectItem value="premium">{t('admin:pages.companies.plans.premium')}</SelectItem>
                        <SelectItem value="enterprise">{t('admin:pages.companies.plans.enterprise')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Owner Information */}
                <div className="space-y-4">
                  <h3 className="font-semibold">{t('admin:pages.companies.form_labels.owner_primary_contact')}</h3>
                  
                  <div className="space-y-2">
                    <Label htmlFor="owner_name">{t('admin:pages.companies.form_labels.owner_name')}</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="owner_name"
                        value={formData.owner_name}
                        onChange={(e) => setFormData(prev => ({ ...prev, owner_name: e.target.value }))}
                        placeholder={t('admin:pages.companies.placeholders.owner_name')}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="owner_phone">{t('admin:pages.companies.form_labels.owner_phone')}</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="owner_phone"
                        {...ownerPhoneHandlers}
                        onBlur={(e) => {
                          ownerPhoneHandlers.onBlur?.(e);
                          handleAutoFillFormat(e.target.value, (value) => 
                            setFormData(prev => ({ ...prev, owner_phone: value })), 'phone'
                          );
                        }}
                        placeholder={t('admin:pages.companies.placeholders.owner_phone')}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="owner_email">{t('admin:pages.companies.form_labels.owner_email')}</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="owner_email"
                        type="email"
                        value={formData.owner_email}
                        onChange={(e) => setFormData(prev => ({ ...prev, owner_email: e.target.value }))}
                        placeholder={t('admin:pages.companies.placeholders.owner_email')}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="owner_title">{t('admin:pages.companies.form_labels.owner_title')}</Label>
                    <Input
                      id="owner_title"
                      value={formData.owner_title}
                      onChange={(e) => setFormData(prev => ({ ...prev, owner_title: e.target.value }))}
                      placeholder={t('admin:pages.companies.placeholders.owner_title')}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-2">
                      <Label htmlFor="max_users">{t('admin:pages.companies.form_labels.max_users')}</Label>
                      <Input
                        id="max_users"
                        type="number"
                        value={formData.max_users}
                        onChange={(e) => setFormData(prev => ({ ...prev, max_users: parseInt(e.target.value) || 5 }))}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="max_vehicles">{t('admin:pages.companies.form_labels.max_vehicles')}</Label>
                      <Input
                        id="max_vehicles"
                        type="number"
                        value={formData.max_vehicles}
                        onChange={(e) => setFormData(prev => ({ ...prev, max_vehicles: parseInt(e.target.value) || 10 }))}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  {t('admin:pages.companies.buttons.cancel')}
                </Button>
                <Button onClick={handleCreateCompany}>
                  {t('admin:pages.companies.buttons.create_company')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <CompanyStats companies={companies} />

      {/* Filters */}
      <CompanyFilters
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        planFilter={planFilter}
        onPlanFilterChange={setPlanFilter}
        stateFilter={stateFilter}
        onStateFilterChange={setStateFilter}
        onClearFilters={clearFilters}
        hasActiveFilters={hasActiveFilters}
      />

      {/* Bulk Actions */}
      {viewMode === 'table' && (
        <CompanyActions
          companies={paginatedCompanies}
          selectedCompanies={selectedCompanies}
          onSelectedCompaniesChange={setSelectedCompanies}
          onBulkStatusChange={handleBulkStatusChange}
        />
      )}

      {/* Content */}
      <Card>
        <CardHeader>
          <CardTitle>
            {t('admin:pages.companies.title')} ({processedCompanies.length})
            {hasActiveFilters && <span className="text-muted-foreground text-sm ml-2">({t('admin:pages.companies.filters.filtered_from', { total: companies.length, defaultValue: `filtered from ${companies.length}` })})</span>}
          </CardTitle>
          <CardDescription>
            {viewMode === 'dashboard' ? t('admin:pages.companies.descriptions.dashboard_view', { defaultValue: 'Analytical view of companies' }) : t('admin:pages.companies.descriptions.list_view', { defaultValue: 'List of companies registered in the system' })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {viewMode === 'table' && (
            <CompanyTableView
              companies={paginatedCompanies}
              onEdit={openEditDialog}
              onDelete={handleDeleteCompany}
              sortField={sortField}
              sortDirection={sortDirection}
              onSort={handleSort}
            />
          )}
          
          {viewMode === 'cards' && (
            <CompanyCardsView
              companies={paginatedCompanies}
              onEdit={openEditDialog}
              onDelete={handleDeleteCompany}
            />
          )}
          
          {viewMode === 'list' && (
            <CompanyListView
              companies={paginatedCompanies}
              onEdit={openEditDialog}
              onDelete={handleDeleteCompany}
            />
          )}
          
          {viewMode === 'dashboard' && (
            <CompanyDashboardView companies={processedCompanies} />
          )}

          {processedCompanies.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              {hasActiveFilters ? t('admin:pages.companies.messages.no_companies_filtered', { defaultValue: "No companies found with applied filters" }) : t('admin:common.no_companies')}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {viewMode !== 'dashboard' && processedCompanies.length > 0 && (
        <CompanyPagination
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          totalItems={processedCompanies.length}
          onPageChange={setCurrentPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setCurrentPage(1);
          }}
        />
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('admin:common.edit_company')}</DialogTitle>
            <DialogDescription>
              {t('admin:pages.companies.descriptions.edit_company', { defaultValue: "Update company information." })}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-4">
              <h3 className="font-semibold">{t('admin:pages.companies.form_labels.company_information')}</h3>
              
              <div className="space-y-2">
                <Label htmlFor="edit-name">{t('admin:pages.companies.form_labels.company_name')} *</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder={t('admin:pages.companies.placeholders.company_name')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-phone">{t('admin:pages.companies.form_labels.company_phone')}</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="edit-phone"
                    {...phoneHandlers}
                    onBlur={(e) => {
                      phoneHandlers.onBlur?.(e);
                      handleAutoFillFormat(e.target.value, (value) => 
                        setFormData(prev => ({ ...prev, phone: value })), 'phone'
                      );
                    }}
                    placeholder={t('admin:pages.companies.placeholders.company_phone')}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-email">{t('admin:pages.companies.form_labels.company_email')}</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="edit-email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder={t('admin:pages.companies.placeholders.company_email')}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-street_address">{t('admin:common.address')} *</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="edit-street_address"
                    value={formData.street_address}
                    onChange={(e) => setFormData(prev => ({ ...prev, street_address: e.target.value }))}
                    placeholder="123 Main Street"
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label htmlFor="edit-state_id">{t('admin:pages.companies.form.state')} *</Label>
                  <StateCombobox
                    value={formData.state_id}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, state_id: value || '' }))}
                    placeholder="Selecciona estado..."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-zip_code">{t('admin:pages.companies.form.zip_code')} *</Label>
                  <Input
                    id="edit-zip_code"
                    value={formData.zip_code}
                    onChange={(e) => setFormData(prev => ({ ...prev, zip_code: e.target.value }))}
                    placeholder="12345"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-plan_type">{t('admin:pages.companies.form_labels.plan_type')}</Label>
                <Select value={formData.plan_type} onValueChange={(value) => setFormData(prev => ({ ...prev, plan_type: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="trial">{t('admin:pages.companies.plans.trial')}</SelectItem>
                    <SelectItem value="basic">{t('admin:pages.companies.plans.basic')}</SelectItem>
                    <SelectItem value="premium">{t('admin:pages.companies.plans.premium')}</SelectItem>
                    <SelectItem value="enterprise">{t('admin:pages.companies.plans.enterprise')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold">{t('admin:pages.companies.form_labels.owner_primary_contact')}</h3>
              
              <div className="space-y-2">
                <Label htmlFor="edit-owner_name">{t('admin:pages.companies.form_labels.owner_name')}</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="edit-owner_name"
                    value={formData.owner_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, owner_name: e.target.value }))}
                    placeholder={t('admin:pages.companies.placeholders.owner_name')}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-owner_phone">{t('admin:pages.companies.form_labels.owner_phone')}</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="edit-owner_phone"
                    {...ownerPhoneHandlers}
                    onBlur={(e) => {
                      ownerPhoneHandlers.onBlur?.(e);
                      handleAutoFillFormat(e.target.value, (value) => 
                        setFormData(prev => ({ ...prev, owner_phone: value })), 'phone'
                      );
                    }}
                    placeholder={t('admin:pages.companies.placeholders.owner_phone')}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-owner_email">{t('admin:pages.companies.form_labels.owner_email')}</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="edit-owner_email"
                    type="email"
                    value={formData.owner_email}
                    onChange={(e) => setFormData(prev => ({ ...prev, owner_email: e.target.value }))}
                    placeholder={t('admin:pages.companies.placeholders.owner_email')}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-owner_title">{t('admin:pages.companies.form_labels.owner_title')}</Label>
                <Input
                  id="edit-owner_title"
                  value={formData.owner_title}
                  onChange={(e) => setFormData(prev => ({ ...prev, owner_title: e.target.value }))}
                  placeholder={t('admin:pages.companies.placeholders.owner_title')}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label htmlFor="edit-max_users">{t('admin:pages.companies.form_labels.max_users')}</Label>
                  <Input
                    id="edit-max_users"
                    type="number"
                    value={formData.max_users}
                    onChange={(e) => setFormData(prev => ({ ...prev, max_users: parseInt(e.target.value) || 5 }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-max_vehicles">{t('admin:pages.companies.form_labels.max_vehicles')}</Label>
                  <Input
                    id="edit-max_vehicles"
                    type="number"
                    value={formData.max_vehicles}
                    onChange={(e) => setFormData(prev => ({ ...prev, max_vehicles: parseInt(e.target.value) || 10 }))}
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              {t('admin:pages.companies.buttons.cancel')}
            </Button>
            <Button onClick={handleEditCompany}>
              {t('admin:common.update_company')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
