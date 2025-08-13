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
import { PageToolbar } from "@/components/layout/PageToolbar";

// Tipos de documentos predefinidos con categorías
const PREDEFINED_DOCUMENT_TYPES = {
  legal: {
    title: "Documentos Legales",
    types: [
      { value: "incorporation", label: "Incorporación", critical: true },
      { value: "ein", label: "EIN (Tax ID)", critical: true },
      { value: "business_license", label: "Licencia Comercial", critical: true },
      { value: "operating_agreement", label: "Acuerdo Operativo", critical: false }
    ]
  },
  insurance: {
    title: "Seguros",
    types: [
      { value: "general_liability", label: "Seguro General", critical: true },
      { value: "auto_liability", label: "Seguro Vehicular", critical: true },
      { value: "cargo_insurance", label: "Seguro de Carga", critical: true },
      { value: "workers_comp", label: "Compensación Trabajadores", critical: false }
    ]
  },
  permits: {
    title: "Permisos y Licencias",
    types: [
      { value: "dot_permit", label: "Permiso DOT", critical: true },
      { value: "mc_authority", label: "Autoridad MC", critical: true },
      { value: "interstate_permit", label: "Permiso Interestatal", critical: false },
      { value: "hazmat_permit", label: "Permiso Materiales Peligrosos", critical: false }
    ]
  },
  financial: {
    title: "Documentos Financieros",
    types: [
      { value: "w9", label: "Formulario W-9", critical: true },
      { value: "bank_statements", label: "Estados Bancarios", critical: false },
      { value: "factoring_agreement", label: "Acuerdo de Factoraje", critical: false },
      { value: "credit_application", label: "Aplicación de Crédito", critical: false }
    ]
  },
  contracts: {
    title: "Contratos",
    types: [
      { value: "broker_agreement", label: "Acuerdo con Broker", critical: false },
      { value: "customer_contract", label: "Contrato Cliente", critical: false },
      { value: "lease_agreement", label: "Acuerdo de Arrendamiento", critical: false }
    ]
  }
};

interface CompanyDocument {
  id: string;
  document_type: string;
  file_name: string;
  file_url: string;
  expires_at?: string;
  created_at: string;
  file_size?: number;
  content_type?: string;
  uploaded_by?: string;
  is_active: boolean;
  archived_at?: string;
  archived_by?: string;
}

export default function Documents() {
  const [activeTab, setActiveTab] = useState("all");
  const [viewMode, setViewMode] = useState<DocumentViewMode>("cards");
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [selectedDocumentType, setSelectedDocumentType] = useState<string>("");
  const [selectedDocuments, setSelectedDocuments] = useState<Set<string>>(new Set());
  const [showArchived, setShowArchived] = useState(false);
  const { showSuccess, showError } = useFleetNotifications();
  const queryClient = useQueryClient();

  // Fetch company documents
  const { data: documents = [], isLoading } = useQuery({
    queryKey: ["company-documents", showArchived],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("company_documents")
        .select("*")
        .eq("is_active", !showArchived)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as CompanyDocument[];
    }
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
      showSuccess("Documento archivado", "El documento ha sido archivado exitosamente");
      // Remove from selection if it was selected
      setSelectedDocuments(prev => {
        const newSet = new Set(prev);
        newSet.delete(archivedDocumentId);
        return newSet;
      });
    },
    onError: (error: any) => {
      showError("Error", error.message || "No se pudo archivar el documento");
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
      showSuccess("Documento restaurado", "El documento ha sido restaurado exitosamente");
      // Remove from selection if it was selected
      setSelectedDocuments(prev => {
        const newSet = new Set(prev);
        newSet.delete(restoredDocumentId);
        return newSet;
      });
    },
    onError: (error: any) => {
      showError("Error", error.message || "No se pudo restaurar el documento");
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
      showError("Sin documentos", "Selecciona al menos un documento para enviar");
      return;
    }
    setEmailModalOpen(true);
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
        title="Documentos de la Compañía"
        subtitle="Gestiona certificados, permisos y documentación legal"
        actions={
          <div className="flex gap-2">
            <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => handleOpenUploadDialog()}>
                  <Plus className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">Subir Documento</span>
                  <span className="sm:hidden">Subir</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Subir Nuevo Documento</DialogTitle>
                  <DialogDescription>
                    Selecciona el tipo de documento y sube el archivo correspondiente
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
      
      <div className="p-2 md:p-4 md:pr-20 space-y-4 md:space-y-6">
        {/* Controls Section */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-2 sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            <Button 
              variant={showArchived ? "default" : "outline"} 
              size="sm"
              onClick={() => setShowArchived(!showArchived)}
            >
              {showArchived ? (
                <>
                  <ArchiveX className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">Ver Activos</span>
                  <span className="sm:hidden">Activos</span>
                </>
              ) : (
                <>
                  <Archive className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">Ver Archivados</span>
                  <span className="sm:hidden">Archivados</span>
                </>
              )}
            </Button>
            {selectedDocuments.size > 0 && (
              <Button variant="outline" size="sm" onClick={handleOpenEmailModal}>
                <Mail className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Enviar por Email ({selectedDocuments.size})</span>
                <span className="sm:hidden">Email ({selectedDocuments.size})</span>
              </Button>
            )}
          </div>
          <DocumentViewToggle 
            currentView={viewMode} 
            onViewChange={setViewMode} 
          />
        </div>

      {/* Status Overview */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">Total Documentos</p>
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
                <p className="text-xs sm:text-sm text-muted-foreground">Por Vencer (30 días)</p>
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
                <p className="text-xs sm:text-sm text-muted-foreground">Vencidos</p>
                <p className="text-lg sm:text-2xl font-bold text-red-600">{statusCounts.expired}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Document Categories */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex flex-wrap gap-1 p-1 md:grid md:grid-cols-7 md:h-auto">
          <TabsTrigger value="all" className="flex items-center gap-1 text-xs md:text-sm px-2 py-1.5 flex-shrink-0">
            <FolderOpen className="h-3 w-3 md:h-4 md:w-4" />
            <span>Todos</span>
          </TabsTrigger>
          <TabsTrigger value="legal" className="flex items-center gap-1 text-xs md:text-sm px-2 py-1.5 flex-shrink-0">
            <FileCheck className="h-3 w-3 md:h-4 md:w-4" />
            <span>Legales</span>
          </TabsTrigger>
          <TabsTrigger value="insurance" className="flex items-center gap-1 text-xs md:text-sm px-2 py-1.5 flex-shrink-0">
            <Shield className="h-3 w-3 md:h-4 md:w-4" />
            <span>Seguros</span>
          </TabsTrigger>
          <TabsTrigger value="permits" className="flex items-center gap-1 text-xs md:text-sm px-2 py-1.5 flex-shrink-0">
            <CheckCircle className="h-3 w-3 md:h-4 md:w-4" />
            <span>Permisos</span>
          </TabsTrigger>
          <TabsTrigger value="financial" className="flex items-center gap-1 text-xs md:text-sm px-2 py-1.5 flex-shrink-0">
            <DollarSign className="h-3 w-3 md:h-4 md:w-4" />
            <span className="hidden sm:inline">Financieros</span>
            <span className="sm:hidden">Money</span>
          </TabsTrigger>
          <TabsTrigger value="contracts" className="flex items-center gap-1 text-xs md:text-sm px-2 py-1.5 flex-shrink-0">
            <Users className="h-3 w-3 md:h-4 md:w-4" />
            <span>Contratos</span>
          </TabsTrigger>
          <TabsTrigger value="other" className="flex items-center gap-1 text-xs md:text-sm px-2 py-1.5 flex-shrink-0">
            <FileText className="h-3 w-3 md:h-4 md:w-4" />
            <span>Otros</span>
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
                {selectedDocuments.size === documents.length ? 'Deseleccionar Todos' : 'Seleccionar Todos'}
              </Button>
              <span className="text-sm text-muted-foreground">
                {selectedDocuments.size} de {documents.length} documentos seleccionados
              </span>
            </div>
          )}
          
          {viewMode === "cards" ? (
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
                getExpiryStatus={getExpiryStatus}
                isArchived={showArchived}
              />
            </div>
          )}
          {documents.length === 0 && (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No hay documentos</h3>
              <p className="text-muted-foreground mb-4">
                Comienza subiendo los documentos esenciales de tu compañía
              </p>
              <Button onClick={() => handleOpenUploadDialog()}>
                <Upload className="w-4 h-4 mr-2" />
                Subir Primer Documento
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
                <span className="hidden sm:inline">Agregar</span>
              </Button>
            </div>
            
{viewMode === "cards" ? (
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
                  getExpiryStatus={getExpiryStatus}
                  isArchived={showArchived}
                />
              </div>
            )}

            {getDocumentsByCategory(categoryKey).length === 0 && (
              <div className="text-center py-8">
                <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground mb-4">
                  No hay documentos en esta categoría
                </p>
                <Button 
                  variant="outline" 
                  onClick={() => handleOpenUploadDialog()}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Subir {category.title}
                </Button>
              </div>
            )}
          </TabsContent>
        ))}

        {/* Other documents */}
        <TabsContent value="other" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Otros Documentos</h2>
            <Button 
              variant="outline" 
              onClick={() => handleOpenUploadDialog("custom")}
            >
              <Plus className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Agregar</span>
            </Button>
          </div>
          
{viewMode === "cards" ? (
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
                getExpiryStatus={getExpiryStatus}
                isArchived={showArchived}
              />
            </div>
          )}
        </TabsContent>
      </Tabs>

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
