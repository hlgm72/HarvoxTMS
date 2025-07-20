import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Upload, Download, Trash2, FileCheck, Plus, Eye } from "lucide-react";
import { GenerateLoadOrderDialog } from "./GenerateLoadOrderDialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface LoadDocument {
  id: string;
  type: 'rate_confirmation' | 'driver_instructions' | 'bol' | 'load_order';
  name: string;
  fileName: string;
  fileSize?: number;
  uploadedAt: Date | string;
  url?: string;
  isRequired?: boolean;
  file?: File; // For temporary documents
}

interface LoadDocumentsSectionProps {
  loadId?: string | null; // Optional for when creating a new load
  loadData?: {
    load_number: string;
    total_amount: number;
    commodity: string;
    weight_lbs?: number;
    broker_name?: string;
    driver_name?: string;
    loadStops: any[];
    company_name?: string;
    company_phone?: string;
    company_email?: string;
  };
  onDocumentsChange?: (documents: LoadDocument[]) => void;
  temporaryDocuments?: LoadDocument[];
  onTemporaryDocumentsChange?: (documents: LoadDocument[]) => void;
}

const documentTypes = [
  {
    type: 'rate_confirmation' as const,
    label: 'Rate Confirmation',
    description: 'Documento del broker con tarifas y términos',
    required: true,
    color: 'destructive'
  },
  {
    type: 'driver_instructions' as const,
    label: 'Driver Instructions',
    description: 'Instrucciones específicas del broker',
    required: false,
    color: 'secondary'
  },
  {
    type: 'bol' as const,
    label: 'Bill of Lading (BOL)',
    description: 'Documento de embarque',
    required: false,
    color: 'secondary'
  }
];

export function LoadDocumentsSection({ 
  loadId, 
  loadData, 
  onDocumentsChange,
  temporaryDocuments = [],
  onTemporaryDocumentsChange 
}: LoadDocumentsSectionProps) {
  const [documents, setDocuments] = useState<LoadDocument[]>([]);
  const [showGenerateLoadOrder, setShowGenerateLoadOrder] = useState(false);
  const [hasLoadOrder, setHasLoadOrder] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const { toast } = useToast();

  // Debug state changes - but don't close modal when loadData changes if it's open
  useEffect(() => {
    console.log('🔍 LoadDocumentsSection - loadData changed:', loadData);
    console.log('🔍 LoadDocumentsSection - showGenerateLoadOrder:', showGenerateLoadOrder);
  }, [loadData, showGenerateLoadOrder]);

  // Debug temporaryDocuments changes
  useEffect(() => {
    console.log('📋 LoadDocumentsSection - temporaryDocuments changed:', temporaryDocuments);
  }, [temporaryDocuments]);

  // Load existing documents when loadId is available
  useEffect(() => {
    if (loadId) {
      loadDocuments();
    }
  }, [loadId]);

  const loadDocuments = async () => {
    if (!loadId) return;

    try {
      const { data, error } = await supabase
        .from('load_documents')
        .select('*')
        .eq('load_id', loadId)
        .is('archived_at', null);

      if (error) throw error;

      const loadDocuments: LoadDocument[] = data.map(doc => ({
        id: doc.id,
        type: doc.document_type as LoadDocument['type'],
        name: documentTypes.find(dt => dt.type === doc.document_type)?.label || doc.document_type,
        fileName: doc.file_name,
        fileSize: doc.file_size,
        uploadedAt: new Date(doc.created_at),
        url: doc.file_url,
        isRequired: doc.document_type === 'rate_confirmation'
      }));

      setDocuments(loadDocuments);
      setHasLoadOrder(loadDocuments.some(doc => doc.type === 'load_order'));
      onDocumentsChange?.(loadDocuments);
    } catch (error) {
      console.error('Error loading documents:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los documentos",
        variant: "destructive",
      });
    }
  };

  const handleFileUpload = async (type: LoadDocument['type'], files: FileList | null) => {
    console.log('🔄 handleFileUpload called', { type, filesCount: files?.length || 0, loadId });
    
    if (!files || files.length === 0) {
      console.log('❌ No files selected');
      return;
    }
    
    // If no loadId, handle as temporary document
    if (!loadId) {
      console.log('📁 Handling as temporary document');
      handleTemporaryFileUpload(type, files);
      return;
    }

    const file = files[0];
    
    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "Error",
        description: "El archivo es muy grande. Máximo 10MB permitido.",
        variant: "destructive",
      });
      return;
    }

    setUploading(type);

    try {
      // Create file path: load_id/document_type_timestamp.ext
      const fileExt = file.name.split('.').pop();
      const fileName = `${type}_${Date.now()}.${fileExt}`;
      const filePath = `${loadId}/${fileName}`;

      // Upload file to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('load-documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('load-documents')
        .getPublicUrl(filePath);

      // Save document metadata to database
      const { data: docData, error: docError } = await supabase
        .from('load_documents')
        .insert({
          load_id: loadId,
          document_type: type,
          file_name: file.name,
          file_url: urlData.publicUrl,
          file_size: file.size,
          content_type: file.type,
          uploaded_by: (await supabase.auth.getUser()).data.user?.id
        })
        .select()
        .single();

      if (docError) throw docError;

      // Add to local state
      const newDocument: LoadDocument = {
        id: docData.id,
        type,
        name: documentTypes.find(dt => dt.type === type)?.label || type,
        fileName: file.name,
        fileSize: file.size,
        uploadedAt: new Date(),
        url: urlData.publicUrl,
        isRequired: type === 'rate_confirmation'
      };

      const updatedDocuments = [...documents, newDocument];
      setDocuments(updatedDocuments);
      onDocumentsChange?.(updatedDocuments);

      toast({
        title: "Éxito",
        description: `${newDocument.name} subido correctamente`,
      });

    } catch (error) {
      console.error('Error uploading document:', error);
      toast({
        title: "Error",
        description: "No se pudo subir el documento. Intenta nuevamente.",
        variant: "destructive",
      });
    } finally {
      setUploading(null);
    }
  };

  const handleTemporaryFileUpload = (type: LoadDocument['type'], files: FileList) => {
    console.log('📂 handleTemporaryFileUpload called', { type, file: files[0]?.name });
    console.log('📂 Current temporaryDocuments:', temporaryDocuments);
    
    const file = files[0];
    
    // Validate file size (50MB limit)
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({
        title: "Error",
        description: "El archivo es demasiado grande. Máximo 50MB.",
        variant: "destructive",
      });
      return;
    }

    // Create temporary document with file data
    const tempDocument: LoadDocument = {
      id: `temp-${Date.now()}`,
      type,
      name: file.name,
      fileName: file.name,
      fileSize: file.size,
      uploadedAt: new Date().toISOString(),
      url: URL.createObjectURL(file), // Create blob URL for preview
      isRequired: ['rate_confirmation', 'signed_contract'].includes(type),
      file: file // Store the actual file for later upload
    };

    console.log('📂 Creating tempDocument:', tempDocument);

    const updatedTempDocs = [...temporaryDocuments, tempDocument];
    console.log('📂 Updated temporaryDocuments:', updatedTempDocs);
    
    onTemporaryDocumentsChange?.(updatedTempDocs);

    toast({
      title: "Documento agregado",
      description: `${file.name} se subirá cuando guardes la carga.`,
    });
  };

  const handleRemoveTemporaryDocument = (documentId: string) => {
    const updatedTempDocs = temporaryDocuments.filter(doc => doc.id !== documentId);
    onTemporaryDocumentsChange?.(updatedTempDocs);
    
    toast({
      title: "Documento removido",
      description: "El documento temporal ha sido eliminado.",
    });
  };

  const handleRemoveDocument = async (documentId: string) => {
    if (!loadId) return;

    try {
      // Archive document in database (soft delete)
      const { error } = await supabase
        .from('load_documents')
        .update({ 
          archived_at: new Date().toISOString(),
          archived_by: (await supabase.auth.getUser()).data.user?.id
        })
        .eq('id', documentId);

      if (error) throw error;

      const updatedDocuments = documents.filter(doc => doc.id !== documentId);
      setDocuments(updatedDocuments);
      onDocumentsChange?.(updatedDocuments);

      toast({
        title: "Éxito",
        description: "Documento eliminado correctamente",
      });

    } catch (error) {
      console.error('Error removing document:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el documento",
        variant: "destructive",
      });
    }
  };

  const handleLoadOrderGenerated = (loadOrderData: any) => {
    console.log('📋 LoadDocumentsSection - handleLoadOrderGenerated called with:', loadOrderData);
    
    const loadOrderDocument: LoadDocument = {
      id: crypto.randomUUID(),
      type: 'load_order',
      name: 'Load Order',
      fileName: `Load_Order_${loadData.load_number}.pdf`,
      uploadedAt: new Date(),
      url: loadOrderData.url
    };

    console.log('📄 LoadDocumentsSection - Created document:', loadOrderDocument);

    const updatedDocuments = [...documents, loadOrderDocument];
    setDocuments(updatedDocuments);
    setHasLoadOrder(true);
    onDocumentsChange?.(updatedDocuments);
    
    console.log('✅ LoadDocumentsSection - Documents updated, hasLoadOrder set to true');
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    const mb = bytes / 1024 / 1024;
    return `${mb.toFixed(2)} MB`;
  };

  const getDocumentStatus = (type: LoadDocument['type']) => {
    const hasDoc = documents.some(doc => doc.type === type);
    const docType = documentTypes.find(dt => dt.type === type);
    
    if (hasDoc) {
      return { status: 'uploaded', color: 'default' };
    } else if (docType?.required) {
      return { status: 'required', color: 'destructive' };
    } else {
      return { status: 'optional', color: 'secondary' };
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          Documentos de la Carga
        </CardTitle>
        <CardDescription>
          Gestiona los documentos necesarios para la carga. Puedes subir documentos ahora o generarlos automáticamente.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Document Upload Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-muted-foreground">Documentos requeridos</h4>
            {loadId && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  // This will be handled by the parent component
                  console.log('Open document management');
                }}
              >
                <FileText className="h-4 w-4 mr-2" />
                Gestionar Documentos
              </Button>
            )}
          </div>
          
          {documentTypes.map((docType) => {
            const status = getDocumentStatus(docType.type);
            const uploadedDoc = documents.find(doc => doc.type === docType.type);
            
            return (
              <div key={docType.type} className="border rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h5 className="font-medium">{docType.label}</h5>
                      <Badge variant={status.color as any}>
                        {status.status === 'uploaded' ? 'Subido' : 
                         status.status === 'required' ? 'Requerido' : 'Opcional'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      {docType.description}
                    </p>
                    
                      {uploadedDoc || temporaryDocuments.find(doc => doc.type === docType.type) ? (
                        <div className="flex items-center gap-2 text-sm">
                          <FileCheck className="h-4 w-4 text-green-500" />
                          <span>{uploadedDoc?.fileName || temporaryDocuments.find(doc => doc.type === docType.type)?.fileName}</span>
                          {(uploadedDoc?.fileSize || temporaryDocuments.find(doc => doc.type === docType.type)?.fileSize) && (
                            <span className="text-muted-foreground">
                              ({formatFileSize(uploadedDoc?.fileSize || temporaryDocuments.find(doc => doc.type === docType.type)?.fileSize)})
                            </span>
                          )}
                          {!loadId && (
                            <Badge variant="secondary" className="text-xs">Pendiente</Badge>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <input
                            type="file"
                            id={`file-upload-${docType.type}`}
                            className="hidden"
                            accept=".pdf,.jpg,.jpeg,.png"
                            onChange={(e) => {
                              console.log('📎 File input onChange triggered', { 
                                type: docType.type, 
                                files: e.target.files?.length || 0 
                              });
                              handleFileUpload(docType.type, e.target.files);
                            }}
                            disabled={uploading === docType.type}
                          />
                          <Button 
                            variant="outline" 
                            size="sm"
                            disabled={uploading === docType.type}
                            onClick={() => {
                              console.log('🖱️ Upload button clicked for:', docType.type);
                              const fileInput = document.getElementById(`file-upload-${docType.type}`) as HTMLInputElement;
                              fileInput?.click();
                            }}
                          >
                            <Upload className="h-4 w-4 mr-2" />
                            {uploading === docType.type ? 'Subiendo...' : 'Subir archivo'}
                          </Button>
                          <span className="text-xs text-muted-foreground">
                            {loadId ? 'PDF, JPG, PNG (máx. 10MB)' : 'Se subirá al guardar la carga'}
                          </span>
                        </div>
                    )}
                  </div>
                  
                   {(uploadedDoc || temporaryDocuments.find(doc => doc.type === docType.type)) && (
                      <div className="flex items-center gap-1">
                        {uploadedDoc && (
                          <>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => uploadedDoc.url && window.open(uploadedDoc.url, '_blank')}
                              title="Ver documento"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => {
                                if (uploadedDoc.url) {
                                  const link = document.createElement('a');
                                  link.href = uploadedDoc.url;
                                  link.download = uploadedDoc.fileName;
                                  link.click();
                                }
                              }}
                              title="Descargar documento"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => {
                            const tempDoc = temporaryDocuments.find(doc => doc.type === docType.type);
                            if (uploadedDoc) {
                              handleRemoveDocument(uploadedDoc.id);
                            } else if (tempDoc) {
                              handleRemoveTemporaryDocument(tempDoc.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Load Order Generation Section */}
        <div className="border-t pt-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h4 className="font-medium mb-1 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Load Order Personalizado
              </h4>
              <p className="text-sm text-muted-foreground mb-3">
                Genera un Load Order con información personalizada para el conductor. 
                Este documento puede tener un monto diferente al Rate Confirmation original.
              </p>
              
              {hasLoadOrder ? (
                <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg border border-green-200">
                  <FileCheck className="h-4 w-4 text-green-600" />
                  <div>
                    <span className="text-sm font-medium text-green-800">Load Order generado</span>
                    <p className="text-xs text-green-600 mt-1">
                      Documento principal para el conductor
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-lg border border-amber-200">
                  <FileText className="h-4 w-4 text-amber-600" />
                  <div>
                    <span className="text-sm text-amber-800">Sin Load Order generado</span>
                    <p className="text-xs text-amber-600 mt-1">
                      El conductor verá el Rate Confirmation original
                    </p>
                  </div>
                </div>
              )}
            </div>
            
            <Button 
              onClick={() => {
                console.log('🔍 LoadDocumentsSection - Button clicked, setting showGenerateLoadOrder to true');
                setShowGenerateLoadOrder(true);
              }}
              variant={hasLoadOrder ? "secondary" : "default"}
              disabled={hasLoadOrder}
            >
              <Plus className="h-4 w-4 mr-2" />
              {hasLoadOrder ? 'Load Order ya generado' : 'Generar Load Order'}
            </Button>
          </div>
        </div>

      </CardContent>

      {/* Generate Load Order Dialog */}
      <GenerateLoadOrderDialog
        isOpen={showGenerateLoadOrder && !!loadData}
        onClose={() => {
          console.log('🔍 LoadDocumentsSection - onClose called, setting showGenerateLoadOrder to false');
          setShowGenerateLoadOrder(false);
        }}
        loadData={loadData || {
          load_number: '',
          total_amount: 0,
          commodity: '',
          weight_lbs: 0,
          broker_name: '',
          driver_name: '',
          loadStops: []
        }}
        onLoadOrderGenerated={handleLoadOrderGenerated}
      />
    </Card>
  );
}
