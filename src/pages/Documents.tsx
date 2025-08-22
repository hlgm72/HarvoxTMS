import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useFleetNotifications } from "@/components/notifications";
import { Upload, FileText, Download, Trash2, AlertCircle, CheckCircle, Calendar, Plus, Mail, CheckSquare, Square, Archive, ArchiveX, Shield, DollarSign, FileCheck, Users, FolderOpen } from "lucide-react";
import { CompanyDocumentUpload } from "@/components/documents/CompanyDocumentUpload";
import { DocumentCard } from "@/components/documents/DocumentCard";
import { DocumentTable } from "@/components/documents/DocumentTable";
import { DocumentViewToggle, DocumentViewMode } from "@/components/documents/DocumentViewToggle";
import { EmailDocumentsModal } from "@/components/documents/EmailDocumentsModal";
import { DocumentEditModal } from "@/components/documents/DocumentEditModal";
import { PageToolbar } from "@/components/layout/PageToolbar";
import { useCompanyCache } from "@/hooks/useCompanyCache";
import { useTranslation } from "react-i18next";

// Función para obtener tipos de documentos con traducciones
const usePredefinedDocumentTypes = () => {
  const { t } = useTranslation('documents');
  
  return {
    legal: {
      title: t('categories.legal_full'),
      types: [
        { value: "incorporation", label: t('types.legal.incorporation'), critical: true },
        { value: "ein", label: t('types.legal.ein'), critical: true },
        { value: "business_license", label: t('types.legal.business_license'), critical: true },
        { value: "operating_agreement", label: t('types.legal.operating_agreement'), critical: false }
      ]
    },
    insurance: {
      title: t('categories.insurance'),
      types: [
        { value: "general_liability", label: t('types.insurance.general_liability'), critical: true },
        { value: "auto_liability", label: t('types.insurance.auto_liability'), critical: true },
        { value: "cargo_insurance", label: t('types.insurance.cargo_insurance'), critical: true },
        { value: "workers_comp", label: t('types.insurance.workers_comp'), critical: false }
      ]
    },
    permits: {
      title: t('categories.permits'),
      types: [
        { value: "dot_permit", label: t('types.permits.dot_permit'), critical: true },
        { value: "mc_authority", label: t('types.permits.mc_authority'), critical: true },
        { value: "interstate_permit", label: t('types.permits.interstate_permit'), critical: false },
        { value: "hazmat_permit", label: t('types.permits.hazmat_permit'), critical: false }
      ]
    },
    financial: {
      title: t('categories.financial'),
      types: [
        { value: "w9", label: t('types.financial.w9'), critical: true },
        { value: "bank_statements", label: t('types.financial.bank_statements'), critical: false },
        { value: "factoring_agreement", label: t('types.financial.factoring_agreement'), critical: false },
        { value: "credit_application", label: t('types.financial.credit_application'), critical: false }
      ]
    },
    contracts: {
      title: t('categories.contracts'),
      types: [
        { value: "broker_agreement", label: t('types.contracts.broker_agreement'), critical: false },
        { value: "customer_contract", label: t('types.contracts.customer_contract'), critical: false },
        { value: "lease_agreement", label: t('types.contracts.lease_agreement'), critical: false }
      ]
    }
  };
};

interface CompanyDocument {
  id: string;
  company_id: string;
  document_type: string;
  file_name: string;
  file_url: string;
  issue_date?: string;
  expires_at?: string;
  created_at: string;
  file_size?: number;
  content_type?: string;
  uploaded_by?: string;
  is_active: boolean;
  archived_at?: string;
  archived_by?: string;
  notes?: string;
}

export default function Documents() {
  const { t } = useTranslation('documents');
  const PREDEFINED_DOCUMENT_TYPES = usePredefinedDocumentTypes();
  
  const [activeTab, setActiveTab] = useState("all");
  const [viewMode, setViewMode] = useState<DocumentViewMode>("cards");
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedDocumentType, setSelectedDocumentType] = useState<string>("");
  const [selectedDocuments, setSelectedDocuments] = useState<Set<string>>(new Set());
  const [editingDocument, setEditingDocument] = useState<CompanyDocument | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const { showSuccess, showError } = useFleetNotifications();
  const queryClient = useQueryClient();
  const { userCompany, isLoading: cacheLoading, error: cacheError } = useCompanyCache();

  // Fetch company documents
  const { data: documents = [], isLoading } = useQuery({
    queryKey: ["company-documents", userCompany?.company_id, showArchived],
    queryFn: async () => {
      if (!userCompany?.company_id) {
        return [];
      }

      const { data, error } = await supabase
        .from("company_documents")
        .select("*")
        .eq("company_id", userCompany.company_id)
        .eq("is_active", !showArchived)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as CompanyDocument[];
    },
    enabled: !!userCompany?.company_id && !cacheLoading && !cacheError
  });

  // Archive document mutation
  const archiveMutation = useMutation({
    mutationFn: async (documentId: string) => {
      const { data, error } = await supabase.rpc('archive_company_document', {
        document_id: documentId
      });

      if (error) throw error;
      if (!(data as any).success) throw new Error((data as any).message);
      return documentId;
    },
    onSuccess: (archivedDocumentId) => {
      queryClient.invalidateQueries({ queryKey: ["company-documents"] });
      showSuccess(t('notifications.archived_success'));
      // Remove from selection if it was selected
      setSelectedDocuments(prev => {
        const newSet = new Set(prev);
        newSet.delete(archivedDocumentId);
        return newSet;
      });
    },
    onError: (error: any) => {
      showError("Error", error.message || t('notifications.archive_error'));
    }
  });

  // Restore document mutation
  const restoreMutation = useMutation({
    mutationFn: async (documentId: string) => {
      const { data, error } = await supabase.rpc('restore_company_document', {
        document_id: documentId
      });

      if (error) throw error;
      if (!(data as any).success) throw new Error((data as any).message);
      return documentId;
    },
    onSuccess: (restoredDocumentId) => {
      queryClient.invalidateQueries({ queryKey: ["company-documents"] });
      showSuccess(t('notifications.restored_success'));
      // Remove from selection if it was selected
      setSelectedDocuments(prev => {
        const newSet = new Set(prev);
        newSet.delete(restoredDocumentId);
        return newSet;
      });
    },
    onError: (error: any) => {
      showError("Error", error.message || t('notifications.restore_error'));
    }
  });

  // Check document expiry status
  const getExpiryStatus = (expiresAt?: string) => {
    if (!expiresAt) return "none";
    
    const expiryDate = new Date(expiresAt);
    const today = new Date();
    const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilExpiry < 0) return "expired";
    if (daysUntilExpiry <= 30) return "expiring";
    return "valid";
  };

  // Get documents by category
  const getDocumentsByCategory = (category: string) => {
    if (category === "all") return documents;
    
    const categoryTypes = PREDEFINED_DOCUMENT_TYPES[category as keyof typeof PREDEFINED_DOCUMENT_TYPES]?.types.map(t => t.value) || [];
    return documents.filter(doc => categoryTypes.includes(doc.document_type));
  };

  // Get document status counts
  const getStatusCounts = () => {
    const expired = documents.filter(doc => getExpiryStatus(doc.expires_at) === "expired").length;
    const expiring = documents.filter(doc => getExpiryStatus(doc.expires_at) === "expiring").length;
    const total = documents.length;
    
    return { expired, expiring, total };
  };

  const statusCounts = getStatusCounts();

  // Selection handlers
  const handleSelectDocument = (documentId: string, selected: boolean) => {
    setSelectedDocuments(prev => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(documentId);
      } else {
        newSet.delete(documentId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    const currentTabDocuments = getDocumentsByCategory(activeTab);
    if (selectedDocuments.size === currentTabDocuments.length) {
      // Deselect all
      setSelectedDocuments(new Set());
    } else {
      // Select all in current tab
      setSelectedDocuments(new Set(currentTabDocuments.map(doc => doc.id)));
    }
  };

  const getSelectedDocumentsList = () => {
    return documents.filter(doc => selectedDocuments.has(doc.id));
  };

  const handleOpenUploadDialog = (documentType?: string) => {
    setSelectedDocumentType(documentType || "");
    setUploadDialogOpen(true);
  };

  const handleOpenEmailModal = () => {
    if (selectedDocuments.size === 0) {
      showError("Error", t('notifications.no_selection'));
      return;
    }
    setEmailModalOpen(true);
  };

  const handleEditDocument = (document: CompanyDocument) => {
    setEditingDocument(document);
    setEditModalOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div>
      <PageToolbar 
        icon={FileText}
        title={t('title')}
        subtitle={t('subtitle')}
        actions={
          <div className="flex gap-2">
            <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => handleOpenUploadDialog()}>
                  <Plus className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">{t('actions.upload')}</span>
                  <span className="sm:hidden">{t('actions.upload_short')}</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{t('upload.title')}</DialogTitle>
                  <DialogDescription>
                    {t('upload.description')}
                  </DialogDescription>
                </DialogHeader>
                <CompanyDocumentUpload
                  predefinedTypes={PREDEFINED_DOCUMENT_TYPES}
                  selectedType={selectedDocumentType}
                  onSuccess={() => {
                    setUploadDialogOpen(false);
                    queryClient.invalidateQueries({ queryKey: ["company-documents"] });
                  }}
                />
              </DialogContent>
            </Dialog>
          </div>
        }
      />
      
      <div className="p-2 md:p-4 space-y-4 md:space-y-6">
        {/* Controls Section */}
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2 items-center">
            <Button 
              variant={showArchived ? "default" : "outline"} 
              size="sm"
              onClick={() => setShowArchived(!showArchived)}
            >
              {showArchived ? (
                <>
                  <ArchiveX className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">{t('actions.view_active')}</span>
                  <span className="sm:hidden">{t('actions.active')}</span>
                </>
              ) : (
                <>
                  <Archive className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">{t('actions.view_archived')}</span>
                  <span className="sm:hidden">{t('actions.archived')}</span>
                </>
              )}
            </Button>
            <DocumentViewToggle 
              currentView={viewMode} 
              onViewChange={setViewMode} 
            />
            {selectedDocuments.size > 0 && (
              <Button variant="outline" size="sm" onClick={handleOpenEmailModal}>
                <Mail className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">{t('actions.email', { count: selectedDocuments.size })}</span>
                <span className="sm:hidden">{t('actions.email_short', { count: selectedDocuments.size })}</span>
              </Button>
            )}
          </div>
        </div>

      {/* Status Overview */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">{t('status.total')}</p>
                <p className="text-lg sm:text-2xl font-bold">{statusCounts.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500" />
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">{t('status.expiring')}</p>
                <p className="text-lg sm:text-2xl font-bold text-amber-600">{statusCounts.expiring}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="col-span-2 lg:col-span-1">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-500" />
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">{t('status.expired')}</p>
                <p className="text-lg sm:text-2xl font-bold text-red-600">{statusCounts.expired}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Document Categories */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 lg:grid-cols-7 h-auto gap-1">
          <TabsTrigger value="all" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm p-2 sm:p-3">
            <FolderOpen className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">{t('categories.all')}</span>
            <span className="sm:hidden">{t('categories.all_short')}</span>
          </TabsTrigger>
          <TabsTrigger value="legal" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm p-2 sm:p-3">
            <FileCheck className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">{t('categories.legal')}</span>
            <span className="sm:hidden">{t('categories.legal')}</span>
          </TabsTrigger>
          <TabsTrigger value="insurance" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm p-2 sm:p-3">
            <Shield className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">{t('categories.insurance')}</span>
            <span className="sm:hidden">{t('categories.insurance_short')}</span>
          </TabsTrigger>
          <TabsTrigger value="permits" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm p-2 sm:p-3">
            <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">{t('categories.permits')}</span>
            <span className="sm:hidden">{t('categories.permits_short')}</span>
          </TabsTrigger>
          <TabsTrigger value="financial" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm p-2 sm:p-3">
            <DollarSign className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">{t('categories.financial')}</span>
            <span className="sm:hidden">{t('categories.financial_short')}</span>
          </TabsTrigger>
          <TabsTrigger value="contracts" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm p-2 sm:p-3">
            <Users className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">{t('categories.contracts')}</span>
            <span className="sm:hidden">{t('categories.contracts_short')}</span>
          </TabsTrigger>
          <TabsTrigger value="other" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm p-2 sm:p-3">
            <FileText className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">{t('categories.other')}</span>
            <span className="sm:hidden">{t('categories.other')}</span>
          </TabsTrigger>
        </TabsList>

        {/* All Documents */}
        <TabsContent value="all" className="space-y-4">
          {documents.length > 0 && (
            <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
              >
                {selectedDocuments.size === documents.length ? (
                  <Square className="w-4 h-4 mr-2" />
                ) : (
                  <CheckSquare className="w-4 h-4 mr-2" />
                )}
                {selectedDocuments.size === documents.length ? t('selection.deselect_all') : t('selection.select_all')}
              </Button>
              <span className="text-sm text-muted-foreground">
                {t('selection.selected', { selected: selectedDocuments.size, total: documents.length })}
              </span>
            </div>
          )}
          
          {documents.length > 0 && (
            viewMode === "cards" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 bg-white rounded-lg shadow-sm">
                {documents.map((document) => (
                  <div key={document.id} className="relative">
                    <div className="absolute top-2 left-2 z-10">
                      <Checkbox
                        checked={selectedDocuments.has(document.id)}
                        onCheckedChange={(checked) => 
                          handleSelectDocument(document.id, checked as boolean)
                        }
                        className="bg-white shadow-sm"
                      />
                    </div>
                    <DocumentCard
                      document={document}
                      predefinedTypes={PREDEFINED_DOCUMENT_TYPES}
                      onArchive={showArchived ? undefined : (id) => archiveMutation.mutate(id)}
                      onRestore={showArchived ? (id) => restoreMutation.mutate(id) : undefined}
                      onEdit={handleEditDocument}
                      getExpiryStatus={getExpiryStatus}
                      isArchived={showArchived}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm">
                <DocumentTable
                  documents={documents}
                  predefinedTypes={PREDEFINED_DOCUMENT_TYPES}
                  selectedDocuments={selectedDocuments}
                  onSelectDocument={handleSelectDocument}
                  onSelectAll={handleSelectAll}
                  onArchive={showArchived ? undefined : (id) => archiveMutation.mutate(id)}
                  onRestore={showArchived ? (id) => restoreMutation.mutate(id) : undefined}
                  onEdit={handleEditDocument}
                  getExpiryStatus={getExpiryStatus}
                  isArchived={showArchived}
                />
              </div>
            )
          )}
          {documents.length === 0 && (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">{t('empty.no_documents')}</h3>
              <p className="text-muted-foreground mb-4">
                {t('empty.no_documents_description')}
              </p>
              <Button onClick={() => handleOpenUploadDialog()}>
                <Upload className="w-4 h-4 mr-2" />
                {t('actions.upload_first')}
              </Button>
            </div>
          )}
        </TabsContent>

        {/* Category-specific tabs */}
        {Object.entries(PREDEFINED_DOCUMENT_TYPES).map(([categoryKey, category]) => (
          <TabsContent key={categoryKey} value={categoryKey} className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">{category.title}</h2>
                <Button 
                variant="outline" 
                onClick={() => handleOpenUploadDialog()}
              >
                <Plus className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">{t('actions.add')}</span>
              </Button>
            </div>
            
            {getDocumentsByCategory(categoryKey).length > 0 && (
              viewMode === "cards" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 bg-white rounded-lg shadow-sm">
                  {getDocumentsByCategory(categoryKey).map((document) => (
                    <div key={document.id} className="relative">
                      <div className="absolute top-2 left-2 z-10">
                        <Checkbox
                          checked={selectedDocuments.has(document.id)}
                          onCheckedChange={(checked) => 
                            handleSelectDocument(document.id, checked as boolean)
                          }
                          className="bg-white shadow-sm"
                        />
                      </div>
                      <DocumentCard
                        document={document}
                        predefinedTypes={PREDEFINED_DOCUMENT_TYPES}
                        onArchive={showArchived ? undefined : (id) => archiveMutation.mutate(id)}
                        onRestore={showArchived ? (id) => restoreMutation.mutate(id) : undefined}
                        onEdit={handleEditDocument}
                        getExpiryStatus={getExpiryStatus}
                        isArchived={showArchived}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white rounded-lg shadow-sm">
                  <DocumentTable
                    documents={getDocumentsByCategory(categoryKey)}
                    predefinedTypes={PREDEFINED_DOCUMENT_TYPES}
                    selectedDocuments={selectedDocuments}
                    onSelectDocument={handleSelectDocument}
                    onSelectAll={handleSelectAll}
                    onArchive={showArchived ? undefined : (id) => archiveMutation.mutate(id)}
                    onRestore={showArchived ? (id) => restoreMutation.mutate(id) : undefined}
                    onEdit={handleEditDocument}
                    getExpiryStatus={getExpiryStatus}
                    isArchived={showArchived}
                  />
                </div>
              )
            )}

            {getDocumentsByCategory(categoryKey).length === 0 && (
              <div className="text-center py-8">
                <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground mb-4">
                  {t('empty.no_category')}
                </p>
                <Button 
                  variant="outline" 
                  onClick={() => handleOpenUploadDialog()}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {t('actions.upload')} {category.title}
                </Button>
              </div>
            )}
          </TabsContent>
        ))}

        {/* Other documents */}
        <TabsContent value="other" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">{t('categories.other_full')}</h2>
            <Button 
              variant="outline" 
              onClick={() => handleOpenUploadDialog("custom")}
            >
              <Plus className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">{t('actions.add')}</span>
            </Button>
          </div>
          
          {documents.filter(doc => !Object.values(PREDEFINED_DOCUMENT_TYPES)
            .flatMap(cat => cat.types.map(t => t.value))
            .includes(doc.document_type)).length > 0 && (
            viewMode === "cards" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 bg-white rounded-lg shadow-sm">
                {documents
                  .filter(doc => !Object.values(PREDEFINED_DOCUMENT_TYPES)
                    .flatMap(cat => cat.types.map(t => t.value))
                    .includes(doc.document_type))
                  .map((document) => (
                    <div key={document.id} className="relative">
                      <div className="absolute top-2 left-2 z-10">
                        <Checkbox
                          checked={selectedDocuments.has(document.id)}
                          onCheckedChange={(checked) => 
                            handleSelectDocument(document.id, checked as boolean)
                          }
                          className="bg-white shadow-sm"
                        />
                      </div>
                      <DocumentCard
                        document={document}
                        predefinedTypes={PREDEFINED_DOCUMENT_TYPES}
                        onArchive={showArchived ? undefined : (id) => archiveMutation.mutate(id)}
                        onRestore={showArchived ? (id) => restoreMutation.mutate(id) : undefined}
                        onEdit={handleEditDocument}
                        getExpiryStatus={getExpiryStatus}
                        isArchived={showArchived}
                      />
                    </div>
                  ))}
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm">
                <DocumentTable
                  documents={documents.filter(doc => !Object.values(PREDEFINED_DOCUMENT_TYPES)
                    .flatMap(cat => cat.types.map(t => t.value))
                    .includes(doc.document_type))}
                  predefinedTypes={PREDEFINED_DOCUMENT_TYPES}
                  selectedDocuments={selectedDocuments}
                  onSelectDocument={handleSelectDocument}
                  onSelectAll={handleSelectAll}
                  onArchive={showArchived ? undefined : (id) => archiveMutation.mutate(id)}
                  onRestore={showArchived ? (id) => restoreMutation.mutate(id) : undefined}
                  onEdit={handleEditDocument}
                  getExpiryStatus={getExpiryStatus}
                  isArchived={showArchived}
                />
              </div>
            )
          )}

          {documents.filter(doc => !Object.values(PREDEFINED_DOCUMENT_TYPES)
            .flatMap(cat => cat.types.map(t => t.value))
            .includes(doc.document_type)).length === 0 && (
            <div className="text-center py-8">
              <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground mb-4">
                {t('empty.no_other')}
              </p>
              <Button 
                variant="outline" 
                onClick={() => handleOpenUploadDialog("custom")}
              >
                <Upload className="w-4 h-4 mr-2" />
                {t('actions.upload')}
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Edit Modal */}
      <DocumentEditModal
        document={editingDocument}
        open={editModalOpen}
        onOpenChange={(open) => {
          setEditModalOpen(open);
          if (!open) setEditingDocument(null);
        }}
      />

      {/* Email Modal */}
      <EmailDocumentsModal
        open={emailModalOpen}
        onOpenChange={setEmailModalOpen}
        selectedDocuments={getSelectedDocumentsList()}
        onSuccess={() => {
          setSelectedDocuments(new Set());
          queryClient.invalidateQueries({ queryKey: ["company-documents"] });
        }}
       />
      </div>
    </div>
  );
}
