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
import { Upload, FileText, Download, Trash2, AlertCircle, CheckCircle, Calendar, Plus, Mail, CheckSquare, Square } from "lucide-react";
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
}

export default function Documents() {
  const [activeTab, setActiveTab] = useState("all");
  const [viewMode, setViewMode] = useState<DocumentViewMode>("cards");
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [selectedDocumentType, setSelectedDocumentType] = useState<string>("");
  const [selectedDocuments, setSelectedDocuments] = useState<Set<string>>(new Set());
  const { showSuccess, showError } = useFleetNotifications();
  const queryClient = useQueryClient();

  // Fetch company documents
  const { data: documents = [], isLoading } = useQuery({
    queryKey: ["company-documents"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("company_documents")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as CompanyDocument[];
    }
  });

  // Delete document mutation
  const deleteMutation = useMutation({
    mutationFn: async (documentId: string) => {
      const { error } = await supabase
        .from("company_documents")
        .delete()
        .eq("id", documentId);

      if (error) throw error;
      return documentId;
    },
    onSuccess: (deletedDocumentId) => {
      queryClient.invalidateQueries({ queryKey: ["company-documents"] });
      showSuccess("Documento eliminado", "El documento ha sido eliminado exitosamente");
      // Remove from selection if it was selected
      setSelectedDocuments(prev => {
        const newSet = new Set(prev);
        newSet.delete(deletedDocumentId);
        return newSet;
      });
    },
    onError: (error) => {
      showError("Error", "No se pudo eliminar el documento");
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
        breadcrumbs={[
          { label: "Documentos" }
        ]}
        title="Documentos de la Compañía"
        actions={
          <div className="flex gap-2">
            <DocumentViewToggle 
              currentView={viewMode} 
              onViewChange={setViewMode} 
            />
            {selectedDocuments.size > 0 && (
              <Button variant="outline" onClick={handleOpenEmailModal}>
                <Mail className="w-4 h-4 mr-2" />
                Enviar por Email ({selectedDocuments.size})
              </Button>
            )}
            <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => handleOpenUploadDialog()}>
                  <Plus className="w-4 h-4 mr-2" />
                  Subir Documento
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
      
      <div className="p-6 space-y-6">

      {/* Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <FileText className="w-5 h-5 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Total Documentos</p>
                <p className="text-2xl font-bold">{statusCounts.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-amber-500" />
              <div>
                <p className="text-sm text-muted-foreground">Por Vencer (30 días)</p>
                <p className="text-2xl font-bold text-amber-600">{statusCounts.expiring}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <div>
                <p className="text-sm text-muted-foreground">Vencidos</p>
                <p className="text-2xl font-bold text-red-600">{statusCounts.expired}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Document Categories */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="all">Todos</TabsTrigger>
          <TabsTrigger value="legal">Legales</TabsTrigger>
          <TabsTrigger value="insurance">Seguros</TabsTrigger>
          <TabsTrigger value="permits">Permisos</TabsTrigger>
          <TabsTrigger value="financial">Financieros</TabsTrigger>
          <TabsTrigger value="contracts">Contratos</TabsTrigger>
          <TabsTrigger value="other">Otros</TabsTrigger>
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                    onDelete={(id) => deleteMutation.mutate(id)}
                    getExpiryStatus={getExpiryStatus}
                  />
                </div>
              ))}
            </div>
          ) : (
            <DocumentTable
              documents={documents}
              predefinedTypes={PREDEFINED_DOCUMENT_TYPES}
              selectedDocuments={selectedDocuments}
              onSelectDocument={handleSelectDocument}
              onSelectAll={handleSelectAll}
              onDelete={(id) => deleteMutation.mutate(id)}
              getExpiryStatus={getExpiryStatus}
            />
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
                Agregar {category.title}
              </Button>
            </div>
            
{viewMode === "cards" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                      onDelete={(id) => deleteMutation.mutate(id)}
                      getExpiryStatus={getExpiryStatus}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <DocumentTable
                documents={getDocumentsByCategory(categoryKey)}
                predefinedTypes={PREDEFINED_DOCUMENT_TYPES}
                selectedDocuments={selectedDocuments}
                onSelectDocument={handleSelectDocument}
                onSelectAll={handleSelectAll}
                onDelete={(id) => deleteMutation.mutate(id)}
                getExpiryStatus={getExpiryStatus}
              />
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
              Agregar Documento Personalizado
            </Button>
          </div>
          
{viewMode === "cards" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                      onDelete={(id) => deleteMutation.mutate(id)}
                      getExpiryStatus={getExpiryStatus}
                    />
                  </div>
                ))}
            </div>
          ) : (
            <DocumentTable
              documents={documents.filter(doc => !Object.values(PREDEFINED_DOCUMENT_TYPES)
                .flatMap(cat => cat.types.map(t => t.value))
                .includes(doc.document_type))}
              predefinedTypes={PREDEFINED_DOCUMENT_TYPES}
              selectedDocuments={selectedDocuments}
              onSelectDocument={handleSelectDocument}
              onSelectAll={handleSelectAll}
              onDelete={(id) => deleteMutation.mutate(id)}
              getExpiryStatus={getExpiryStatus}
            />
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
