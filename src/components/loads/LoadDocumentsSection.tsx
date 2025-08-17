import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { FileText, Upload, Eye, Download, Trash2, RotateCcw, Plus, Loader2, Check } from 'lucide-react';
import DocumentPreview from './DocumentPreview';
import { LoadDocumentValidationIndicator } from './LoadDocumentValidationIndicator';
import { GenerateLoadOrderDialog } from './GenerateLoadOrderDialog';
import { useFleetNotifications } from "@/components/notifications";
import { useQueryClient } from "@tanstack/react-query";
import { useLoadDocuments } from "@/contexts/LoadDocumentsContext";
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

interface LoadDocument {
  id: string;
  type: 'rate_confirmation' | 'driver_instructions' | 'bol' | 'load_order' | 'pod' | 'load_invoice';
  name: string;
  fileName: string;
  fileSize?: number;
  uploadedAt: Date | string;
  url: string;
}

interface LoadDocumentsSectionProps {
  loadId?: string;
  loadNumber?: string;
  loadData?: any;
  documents?: LoadDocument[];
  temporaryDocuments?: LoadDocument[];
  onDocumentsChange?: (documents: LoadDocument[]) => void;
  onTemporaryDocumentsChange?: (documents: LoadDocument[]) => void;
  isDialogMode?: boolean;
  onOpenChange?: (open: boolean) => void;
  onClose?: () => void;
  isOpen?: boolean;
  wizardMode?: boolean;
  canGenerate?: boolean;
  showGenerateButton?: boolean;
}

const documentTypes = [
  {
    type: 'rate_confirmation' as const,
    label: 'Rate Confirmation',
    description: 'Confirmación de tarifa del broker',
    required: true,
    generated: false,
    gridPosition: 'row1-col1'
  },
  {
    type: 'driver_instructions' as const,
    label: 'Driver Instructions',
    description: 'Instrucciones específicas para el conductor',
    required: false,
    generated: false,
    gridPosition: 'row1-col2'
  },
  {
    type: 'bol' as const,
    label: 'Bill of Lading',
    description: 'Documento de embarque',
    required: false,
    generated: false,
    gridPosition: 'row2-col1'
  },
  {
    type: 'pod' as const,
    label: 'POD (Proof of Delivery)',
    description: 'Prueba de entrega',
    required: true,
    generated: false,
    gridPosition: 'row2-col2'
  },
  {
    type: 'load_order' as const,
    label: 'Load Order',
    description: 'Orden de carga generada automáticamente',
    required: false,
    generated: true,
    gridPosition: 'row3-col1'
  },
  {
    type: 'load_invoice' as const,
    label: 'Load Invoice',
    description: 'Factura de la carga',
    required: false,
    generated: false,
    gridPosition: 'row3-col2'
  }
];

// Helper function to generate standardized file names
const generateDocumentFileName = (loadNumber: string, documentType: string, originalFileName: string, otherDocCount?: number): string => {
  const cleanLoadNumber = loadNumber.replace('#', '').replace('-', '-');
  let docTypeName = '';
  
  switch (documentType) {
    case 'rate_confirmation':
      docTypeName = 'Rate_Confirmation';
      break;
    case 'driver_instructions':
      docTypeName = 'Driver_Instructions';
      break;
    case 'bol':
      docTypeName = 'Bill_of_Lading';
      break;
    case 'pod':
      docTypeName = 'Proof_of_Delivery';
      break;
    case 'load_order':
      docTypeName = 'Load_Order';
      break;
    case 'load_invoice':
      docTypeName = 'Load_Invoice';
      break;
    default:
      const counter = otherDocCount ? otherDocCount + 1 : 1;
      docTypeName = `Other_Document_${counter}`;
      break;
  }
  
  const fileExtension = originalFileName.split('.').pop();
  return `${cleanLoadNumber}_${docTypeName}.${fileExtension}`;
};

// Helper function to check if load order can be generated
const canGenerateLoadOrder = (loadData: any): boolean => {
  if (!loadData) return false;
  
  const hasBasicInfo = !!(
    loadData.load_number &&
    loadData.commodity &&
    loadData.total_amount &&
    loadData.pickup_date &&
    loadData.delivery_date
  );
  
  const hasStops = loadData.stops && loadData.stops.length >= 2;
  
  const stopsHaveInfo = hasStops && loadData.stops.every((stop: any) => 
    stop.company_name && 
    stop.address && 
    stop.city && 
    stop.state
  );
  
  return hasBasicInfo && hasStops && stopsHaveInfo;
};

export function LoadDocumentsSection({
  loadId,
  loadData,
  documents: propDocuments = [],
  temporaryDocuments = [],
  onDocumentsChange,
  onTemporaryDocumentsChange,
  isDialogMode = false,
  onOpenChange,
  onClose,
  isOpen = false,
  wizardMode = false,
  canGenerate = false,
  showGenerateButton = false
}: LoadDocumentsSectionProps) {
  const [documents, setDocuments] = useState<LoadDocument[]>(propDocuments);
  const [uploadingDocuments, setUploadingDocuments] = useState<Set<string>>(new Set());
  const [removingDocuments, setRemovingDocuments] = useState<Set<string>>(new Set());
  const [showGenerateLoadOrder, setShowGenerateLoadOrder] = useState(false);
  const [hasLoadOrder, setHasLoadOrder] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const { showSuccess, showError } = useFleetNotifications();
  const queryClient = useQueryClient();
  const { notifyDocumentChange } = useLoadDocuments();
  
  // Get current user
  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) throw error;
      return user;
    }
  });

  // Check if Load Order exists
  useEffect(() => {
    const loadOrderExists = [...documents, ...temporaryDocuments].some(doc => doc.type === 'load_order');
    setHasLoadOrder(loadOrderExists);
  }, [documents, temporaryDocuments]);

  // Load documents from database when loadId changes
  useEffect(() => {
    if (loadId && loadId !== 'temp' && !wizardMode) {
      loadDocuments();
    }
  }, [loadId, wizardMode]);

  // Update local state when prop documents change
  useEffect(() => {
    if (propDocuments && propDocuments.length !== documents.length) {
      setDocuments(propDocuments);
    }
  }, [propDocuments.length]);

  const loadDocuments = async () => {
    if (!loadId || loadId === 'temp') return;

    try {
      console.log('🔄 LoadDocumentsSection - Loading documents for load:', loadId);
      
      // Use the secure function to load documents
      const { data: loadDocuments, error } = await supabase.rpc('get_load_documents_with_validation', {
        target_load_id: loadId
      });

      if (error) {
        console.error('❌ LoadDocumentsSection - Error loading documents:', error);
        throw error;
      }

      console.log('✅ LoadDocumentsSection - Documents loaded:', loadDocuments?.length || 0);
      console.log('📄 LoadDocumentsSection - Document details:', loadDocuments);

      const formattedDocuments: LoadDocument[] = (loadDocuments || []).map(doc => ({
        id: doc.id,
        type: doc.document_type as LoadDocument['type'],
        name: documentTypes.find(dt => dt.type === doc.document_type)?.label || doc.document_type,
        fileName: doc.file_name,
        fileSize: doc.file_size || undefined,
        uploadedAt: doc.created_at,
        url: doc.file_url
      }));

      console.log('📋 LoadDocumentsSection - Formatted documents:', formattedDocuments);
      setDocuments(formattedDocuments);
      onDocumentsChange?.(formattedDocuments);
    } catch (error) {
      console.error('Error loading documents:', error);
      showError("Error", "No se pudieron cargar los documentos");
    }
  };

  const handleFileUpload = async (file: File, documentType: string) => {
    setUploading(documentType);
    setUploadingDocuments(prev => new Set([...prev, documentType]));
    
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${loadData.load_number}_${documentType}_${Date.now()}.${fileExt}`;
      const filePath = `${user?.id}/${loadData.id}/${fileName}`;

      const { data, error } = await supabase.storage
        .from('load-documents')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error('Error uploading file:', error);
        showError("Error", "No se pudo subir el archivo");
        return;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('load-documents')
        .getPublicUrl(filePath);

      const documentData = {
        load_id: loadData.id,
        document_type: documentType,
        file_name: file.name,
        file_url: filePath, // Save the file path, not the public URL
        uploaded_by: user?.id || '',
      };

      const { error: dbError } = await supabase
        .from('load_documents')
        .insert(documentData);

      if (dbError) {
        console.error('Error saving document to database:', dbError);
        await supabase.storage.from('load-documents').remove([filePath]);
        showError("Error", "No se pudo guardar la información del documento");
        return;
      }

      await loadDocuments();
      showSuccess("Documento subido", `${file.name} se subió correctamente`);
    } catch (error) {
      console.error('Error uploading document:', error);
      showError("Error", "Error inesperado al subir el documento");
    } finally {
      setUploading(null);
      setUploadingDocuments(prev => {
        const newSet = new Set(prev);
        newSet.delete(documentType);
        return newSet;
      });
    }
  };

  const handleFileSelect = (file: File, documentType: string) => {
    handleFileUpload(file, documentType);
  };

  const handleRemoveDocument = async (documentId: string) => {
    setRemovingDocuments(prev => new Set([...prev, documentId]));
    
    try {
      const document = documents.find(doc => doc.id === documentId);
      if (!document) return;

      const { error: dbError } = await supabase
        .from('load_documents')
        .delete()
        .eq('id', documentId);

      if (dbError) {
        console.error('Error removing document from database:', dbError);
        showError("Error", "No se pudo eliminar el documento");
        return;
      }

      if (document.url && !document.url.startsWith('blob:')) {
        let storageFilePath = document.url;
        if (document.url.includes('/load-documents/')) {
          storageFilePath = document.url.split('/load-documents/')[1];
        }
        
        const { error: storageError } = await supabase.storage
          .from('load-documents')
          .remove([storageFilePath]);

        if (storageError) {
          console.warn('Warning: Could not remove file from storage:', storageError);
        }
      }

      await loadDocuments();
      showSuccess("Documento eliminado", `${document.fileName} se eliminó correctamente`);
    } catch (error) {
      console.error('Error removing document:', error);
      showError("Error", "Error inesperado al eliminar el documento");
    } finally {
      setRemovingDocuments(prev => {
        const newSet = new Set(prev);
        newSet.delete(documentId);
        return newSet;
      });
    }
  };

  const handleLoadOrderGenerated = async (data: { url: string; amount: number }) => {
    try {
      // Reload documents to show the new Load Order
      await loadDocuments();
      setHasLoadOrder(true);
      showSuccess("Load Order generado", "El Load Order se ha generado y guardado exitosamente");
    } catch (error) {
      console.error('Error after Load Order generation:', error);
      showError("Error", "Error al actualizar la lista de documentos");
    }
  };

  const renderDocumentCard = (docType: typeof documentTypes[0]) => {
    const allDocuments = [...documents, ...temporaryDocuments];
    const existingDoc = allDocuments.find(doc => doc.type === docType.type);
    const isUploading = uploadingDocuments.has(docType.type) || uploading === docType.type;
    const isRemoving = existingDoc ? removingDocuments.has(existingDoc.id) : false;

    return (
      <div key={docType.type} className="p-3 border rounded-lg bg-white">
        {/* Main flex container: left content, right preview */}
        <div className="flex gap-3">
          {/* Left column: All content and actions */}
          <div className="flex-1 space-y-2">
            {/* Header: Document title and required badge */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium text-sm">{docType.label}</span>
              </div>
              <div className="flex items-center gap-1">
                {docType.required && <Badge variant="destructive" className="text-[10px] h-4 px-1">Requerido</Badge>}
                {docType.generated && existingDoc && <Badge variant="secondary" className="text-[10px] h-4 px-1">Generado</Badge>}
              </div>
            </div>

            {/* Document description */}
            <p className="text-xs text-muted-foreground leading-tight">{docType.description}</p>

            {/* File name */}
            <div className="min-h-[16px]">
              {existingDoc ? (
                <span className="text-xs font-medium text-foreground">{existingDoc.fileName}</span>
              ) : (
                <span className="text-xs text-muted-foreground italic">Sin documento</span>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-1 pt-1 flex-wrap">
              {existingDoc ? (
                <>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    disabled={isRemoving} 
                    title="Ver documento" 
                    className="h-7 text-xs"
                    onClick={async () => {
                      try {
                        if (existingDoc.url.startsWith('blob:')) {
                          window.open(existingDoc.url, '_blank');
                          return;
                        }
                        if (existingDoc.url.includes('supabase.co/storage/v1/object/public/')) {
                          window.open(existingDoc.url, '_blank');
                          return;
                        }
                        let storageFilePath = existingDoc.url;
                        if (existingDoc.url.includes('supabase.co/storage/v1/object/')) {
                          const parts = existingDoc.url.split('/load-documents/');
                          if (parts.length > 1) {
                            storageFilePath = parts[1];
                          }
                        }
                        const { data: signedUrlData, error: urlError } = await supabase.storage
                          .from('load-documents')
                          .createSignedUrl(storageFilePath, 3600);
                        if (urlError) {
                          showError("Error", "No se pudo generar el enlace para ver el documento");
                          return;
                        }
                        if (signedUrlData?.signedUrl) {
                          window.open(signedUrlData.signedUrl, '_blank');
                        }
                      } catch (error) {
                        showError("Error", "No se pudo abrir el documento");
                      }
                    }}
                  >
                    <Eye className="h-3 w-3" />
                  </Button>
                  <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={async () => {
                    try {
                      if (existingDoc.url.startsWith('blob:')) {
                        const response = await fetch(existingDoc.url);
                        const blob = await response.blob();
                        const blobUrl = window.URL.createObjectURL(blob);
                        const link = document.createElement('a');
                        link.href = blobUrl;
                        link.download = existingDoc.fileName;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        window.URL.revokeObjectURL(blobUrl);
                        showSuccess("Descarga iniciada", `${existingDoc.fileName} se está descargando`);
                        return;
                      }
                      let downloadStoragePath = existingDoc.url;
                      if (existingDoc.url.includes('/load-documents/')) {
                        downloadStoragePath = existingDoc.url.split('/load-documents/')[1];
                      }
                      const { data: signedUrlData, error: urlError } = await supabase.storage
                        .from('load-documents')
                        .createSignedUrl(downloadStoragePath, 3600);
                      if (urlError) {
                        showError("Error", "No se pudo generar el enlace de descarga");
                        return;
                      }
                      if (!signedUrlData?.signedUrl) {
                        showError("Error", "No se pudo obtener la URL firmada");
                        return;
                      }
                      const response = await fetch(signedUrlData.signedUrl);
                      if (!response.ok) throw new Error('Network response was not ok');
                      const blob = await response.blob();
                      const blobUrl = window.URL.createObjectURL(blob);
                      const link = document.createElement('a');
                      link.href = blobUrl;
                      link.download = existingDoc.fileName;
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                      window.URL.revokeObjectURL(blobUrl);
                      showSuccess("Descarga iniciada", `${existingDoc.fileName} se está descargando`);
                    } catch (error) {
                      showError("Error", "No se pudo descargar el documento");
                    }
                  }} disabled={isRemoving} title="Descargar documento">
                    <Download className="h-3 w-3" />
                  </Button>
                  <input
                    type="file"
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        handleFileSelect(e.target.files[0], docType.type);
                      }
                      e.target.value = '';
                    }}
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    className="hidden"
                    id={`replace-${docType.type}`}
                  />
                  <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => {
                    document.getElementById(`replace-${docType.type}`)?.click();
                  }} disabled={isUploading || isRemoving} title="Reemplazar documento">
                    <RotateCcw className="h-3 w-3" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm"
                        disabled={isRemoving}
                        className="text-destructive hover:text-destructive h-7 w-7 p-0"
                        title="Eliminar documento"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar documento?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta acción eliminará permanentemente "{existingDoc.fileName}". 
                          No se puede deshacer.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => {
                            handleRemoveDocument(existingDoc.id);
                          }}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Eliminar
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </>
              ) : docType.generated ? (
                <Button
                  onClick={() => setShowGenerateLoadOrder(true)}
                  disabled={isUploading || !canGenerateLoadOrder(loadData)}
                  size="sm"
                  className="h-7 text-xs"
                  title={canGenerateLoadOrder(loadData) ? "Generar Load Order" : "Faltan datos de la carga o paradas para generar el Load Order"}
                >
                  <FileText className="h-3 w-3 mr-1" />
                  Generar Load Order
                </Button>
              ) : (
                <>
                  <input
                    type="file"
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        handleFileSelect(e.target.files[0], docType.type);
                      }
                      e.target.value = '';
                    }}
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    className="hidden"
                    id={`upload-${docType.type}`}
                  />
                  <Button
                    onClick={() => document.getElementById(`upload-${docType.type}`)?.click()}
                    disabled={isUploading}
                    size="sm"
                    className="h-7 text-xs"
                  >
                    <Upload className="h-3 w-3 mr-1" />
                    {isUploading ? 'Subiendo...' : 'Subir'}
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Right column: Preview Section */}
          <div className="flex-shrink-0">
            {existingDoc ? (
              <DocumentPreview
                documentUrl={existingDoc.url}
                fileName={existingDoc.fileName}
                className="w-32 h-24"
              />
            ) : (
              <div className="w-32 h-24 border border-dashed border-border/40 rounded flex items-center justify-center bg-muted/20">
                <FileText className="h-8 w-8 text-muted-foreground" />
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderDocumentManagement = () => {
    const row1Docs = documentTypes.filter(doc => doc.gridPosition?.startsWith('row1'));
    const row2Docs = documentTypes.filter(doc => doc.gridPosition?.startsWith('row2'));
    const row3Docs = documentTypes.filter(doc => doc.gridPosition?.startsWith('row3'));

    return (
      <div className="space-y-6">
        {/* Row 1: Rate Confirmation y Driver Instructions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {row1Docs.map(renderDocumentCard)}
        </div>

        {/* Row 2: BOL y POD */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {row2Docs.map(renderDocumentCard)}
        </div>

        {/* Row 3: Load Order y Load Invoice */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {row3Docs.map(renderDocumentCard)}
        </div>
      </div>
    );
  };

  if (isDialogMode) {
    return (
      <>
        <Dialog open={isOpen} onOpenChange={(open) => {
          if (!open) {
            onClose?.();
            onOpenChange?.(false);
          }
        }}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <span>
                  Documentos de la Carga {loadData?.load_number ? `#${loadData.load_number}` : ''}
                </span>
                {loadData?.id && (
                  <LoadDocumentValidationIndicator 
                    loadId={loadData.id} 
                    loadStatus={loadData.status || 'pending'}
                    compact={true}
                  />
                )}
              </DialogTitle>
            </DialogHeader>
            {renderDocumentManagement()}
          </DialogContent>
        </Dialog>

        <GenerateLoadOrderDialog
          isOpen={showGenerateLoadOrder}
          onClose={() => setShowGenerateLoadOrder(false)}
          loadData={loadData}
          onLoadOrderGenerated={handleLoadOrderGenerated}
        />
      </>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Documentos de la Carga
            {loadData?.id && (
              <LoadDocumentValidationIndicator 
                loadId={loadData.id} 
                loadStatus={loadData.status || 'pending'}
                compact={true}
              />
            )}
          </CardTitle>
          <CardDescription>
            Gestiona todos los documentos relacionados con esta carga
          </CardDescription>
        </CardHeader>
        <CardContent>
          {renderDocumentManagement()}
        </CardContent>
      </Card>

      <GenerateLoadOrderDialog
        isOpen={showGenerateLoadOrder}
        onClose={() => setShowGenerateLoadOrder(false)}
        loadData={loadData}
        onLoadOrderGenerated={handleLoadOrderGenerated}
      />
    </>
  );
}
