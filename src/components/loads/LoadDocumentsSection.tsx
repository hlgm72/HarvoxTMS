import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { FileText, Upload, Eye, Download, Trash2, RotateCcw, Plus, Loader2, Check, ChevronDown } from 'lucide-react';
import DocumentPreview from './DocumentPreview';
import { LoadDocumentValidationIndicator } from './LoadDocumentValidationIndicator';
import { GenerateLoadOrderDialog } from './GenerateLoadOrderDialog';
import { LoadPhotosSection } from './LoadPhotosSection';
import { useFleetNotifications } from "@/components/notifications";
import { useQueryClient } from "@tanstack/react-query";
import { useLoadDocuments } from "@/contexts/LoadDocumentsContext";
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

interface LoadDocument {
  id: string;
  type: 'rate_confirmation' | 'driver_instructions' | 'bol' | 'load_order' | 'pod' | 'load_invoice' | 'load_photos';
  name: string;
  fileName: string;
  fileSize?: number;
  uploadedAt: Date | string;
  url: string;
  category?: 'pickup' | 'delivery';
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
    label: 'Rate Confirmation (RC)',
    shortLabel: 'RC',
    description: 'Confirmación de tarifa del broker',
    required: true,
    generated: false,
  },
  {
    type: 'driver_instructions' as const,
    label: 'Driver Instructions (DI)',
    shortLabel: 'DI',
    description: 'Instrucciones específicas para el conductor',
    required: false,
    generated: false,
  },
  {
    type: 'bol' as const,
    label: 'Bill of Lading (BOL)',
    shortLabel: 'BOL',
    description: 'Documento de embarque',
    required: false,
    generated: false,
  },
  {
    type: 'pod' as const,
    label: 'POD (Proof of Delivery)',
    shortLabel: 'POD',
    description: 'Prueba de entrega',
    required: true,
    generated: false,
  },
  {
    type: 'load_invoice' as const,
    label: 'Load Invoice (LI)',
    shortLabel: 'LI',
    description: 'Factura de la carga',
    required: false,
    generated: false,
  },
  {
    type: 'load_order' as const,
    label: 'Load Order',
    shortLabel: 'Load Order',
    description: 'Orden de carga generada automáticamente',
    required: false,
    generated: true,
  },
  {
    type: 'load_photos' as const,
    label: 'Fotos de la Carga',
    shortLabel: 'Fotos',
    description: 'Fotografías del pickup y delivery (máx. 4 por categoría)',
    required: false,
    generated: false,
    allowMultiple: true,
    maxFiles: 8,
    acceptedTypes: ['image/jpeg', 'image/png', 'image/webp'],
    categories: ['pickup', 'delivery']
  }
];

// Filtrar documentos disponibles para subir (excluyendo load_photos que tiene su propia sección)
const uploadableDocumentTypes = documentTypes.filter(doc => doc.type !== 'load_photos' && !doc.generated);

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
  console.log('🔍 canGenerateLoadOrder - Checking loadData:', loadData);
  
  if (!loadData) {
    console.log('❌ canGenerateLoadOrder - No loadData provided');
    return false;
  }
  
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
  
  console.log('🔍 canGenerateLoadOrder - Results:', {
    hasBasicInfo,
    hasStops,
    stopsHaveInfo,
    stopsCount: loadData.stops?.length || 0,
    finalResult: hasBasicInfo && hasStops && stopsHaveInfo
  });
  
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
  const [selectedDocumentType, setSelectedDocumentType] = useState<string>('');
  const [showUploadDropdown, setShowUploadDropdown] = useState(false);
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

      const formattedDocuments: LoadDocument[] = (loadDocuments || []).map(doc => {
        let category: 'pickup' | 'delivery' | undefined = undefined;
        
        // Extract category from file name for load_photos
        if (doc.document_type === 'load_photos' && doc.file_name) {
          if (doc.file_name.includes('_pickup_')) {
            category = 'pickup';
          } else if (doc.file_name.includes('_delivery_')) {
            category = 'delivery';
          }
        }
        
        return {
          id: doc.id,
          type: doc.document_type as LoadDocument['type'],
          name: documentTypes.find(dt => dt.type === doc.document_type)?.label || doc.document_type,
          fileName: doc.file_name,
          fileSize: doc.file_size || undefined,
          uploadedAt: doc.created_at,
          url: doc.file_url,
          category
        };
      });

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
      
      // Generate proper filename based on document type
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
        case 'load_invoice':
          docTypeName = 'Load_Invoice';
          break;
        case 'load_order':
          docTypeName = 'Load_Order';
          break;
        case 'load_photos':
          docTypeName = 'Load_Photos';
          break;
        default:
          docTypeName = documentType;
      }
      
      const fileName = `${loadData.load_number}_${docTypeName}.${fileExt}`;
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
        file_name: fileName,
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

  // Get available document types (not uploaded yet)
  const getAvailableDocumentTypes = () => {
    const uploadedTypes = [...documents, ...temporaryDocuments].map(doc => doc.type);
    return uploadableDocumentTypes.filter(docType => !uploadedTypes.includes(docType.type));
  };

  const handleUploadClick = (documentType: string) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.doc,.docx,.jpg,.jpeg,.png,.gif';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        handleFileSelect(file, documentType);
      }
    };
    input.click();
    setShowUploadDropdown(false);
  };

  const handleRemoveDocument = async (documentId: string) => {
    setRemovingDocuments(prev => new Set([...prev, documentId]));
    
    try {
      const document = documents.find(doc => doc.id === documentId);
      if (!document) return;

      // First, delete from database
      const { error: dbError } = await supabase
        .from('load_documents')
        .delete()
        .eq('id', documentId);

      if (dbError) {
        console.error('Error removing document from database:', dbError);
        showError("Error", "No se pudo eliminar el documento");
        return;
      }

      // Remove file from storage if it exists
      console.log('🗂️ handleRemoveDocument - Checking storage deletion. Document URL:', document.url);
      if (document.url && !document.url.startsWith('blob:')) {
        console.log('📦 handleRemoveDocument - Attempting storage deletion...');
        let storageFilePath = document.url;
        
        // Extract the file path from the public URL
        if (document.url.includes('/storage/v1/object/public/load-documents/')) {
          storageFilePath = document.url.split('/storage/v1/object/public/load-documents/')[1];
          console.log('🔗 handleRemoveDocument - Extracted path from public URL:', storageFilePath);
        } else if (document.url.includes('/load-documents/')) {
          storageFilePath = document.url.split('/load-documents/')[1];
          console.log('🔗 handleRemoveDocument - Extracted path from load-documents URL:', storageFilePath);
        } else {
          console.log('🔗 handleRemoveDocument - Using original URL as path:', storageFilePath);
        }
        
        const { error: storageError } = await supabase.storage
          .from('load-documents')
          .remove([storageFilePath]);

        if (storageError) {
          console.error('❌ handleRemoveDocument - Storage error:', storageError);
        } else {
          console.log('✅ handleRemoveDocument - Successfully deleted from storage');
        }
      } else {
        console.log('⏭️ handleRemoveDocument - Skipping storage deletion (no valid URL)');
      }

      console.log('🔄 handleRemoveDocument - Reloading documents...');
      await loadDocuments();
      console.log('🎉 handleRemoveDocument - Process completed');
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

  const handleLoadOrderGenerated = async (data: { blob: Blob; amount: number }) => {
    console.log('🔥 handleLoadOrderGenerated - FUNCTION CALLED WITH DATA:', data);
    try {
      // Create file from blob
      const fileName = `${loadData.load_number}_Load_Order.pdf`;
      const file = new File([data.blob], fileName, { type: 'application/pdf' });
      
      // Use the same upload flow as other documents
      await handleFileSelect(file, 'load_order');
      
      setHasLoadOrder(true);
      showSuccess("Load Order generado", "El Load Order se ha generado y guardado exitosamente");
      
      console.log('🎉 handleLoadOrderGenerated - Process completed successfully');
    } catch (error) {
      console.error('❌ handleLoadOrderGenerated - Error:', error);
      showError("Error", "Error al generar o guardar el Load Order. Intenta nuevamente.");
    }
  };

  const renderDocumentCard = (docType: typeof documentTypes[0], document: LoadDocument) => {
    const isUploading = uploadingDocuments.has(docType.type) || uploading === docType.type;
    const isRemoving = removingDocuments.has(document.id);

    return (
      <div className="p-3 border rounded-lg bg-white">
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
                {docType.generated && <Badge variant="secondary" className="text-[10px] h-4 px-1">Generado</Badge>}
              </div>
            </div>

            {/* Document description */}
            <p className="text-xs text-muted-foreground leading-tight">{docType.description}</p>

            {/* File name */}
            <div className="min-h-[16px]">
              <span className="text-xs font-medium text-foreground">{document.fileName}</span>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-1 pt-1 flex-wrap">
              <Button 
                variant="outline" 
                size="sm" 
                disabled={isRemoving} 
                title="Ver documento" 
                className="h-7 text-xs"
                onClick={async () => {
                  try {
                    if (document.url.startsWith('blob:')) {
                      window.open(document.url, '_blank');
                      return;
                    }
                    if (document.url.includes('supabase.co/storage/v1/object/public/')) {
                      window.open(document.url, '_blank');
                      return;
                    }
                    let storageFilePath = document.url;
                    if (document.url.includes('supabase.co/storage/v1/object/')) {
                      const parts = document.url.split('/load-documents/');
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
                  if (document.url.startsWith('blob:')) {
                    const response = await fetch(document.url);
                    const blob = await response.blob();
                    const blobUrl = window.URL.createObjectURL(blob);
                    const link = window.document.createElement('a');
                    link.href = blobUrl;
                    link.download = document.fileName;
                    window.document.body.appendChild(link);
                    link.click();
                    window.document.body.removeChild(link);
                    window.URL.revokeObjectURL(blobUrl);
                    showSuccess("Descarga iniciada", `${document.fileName} se está descargando`);
                    return;
                  }
                  let downloadStoragePath = document.url;
                  if (document.url.includes('/load-documents/')) {
                    downloadStoragePath = document.url.split('/load-documents/')[1];
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
                  const link = window.document.createElement('a');
                  link.href = blobUrl;
                  link.download = document.fileName;
                  window.document.body.appendChild(link);
                  link.click();
                  window.document.body.removeChild(link);
                  window.URL.revokeObjectURL(blobUrl);
                  showSuccess("Descarga iniciada", `${document.fileName} se está descargando`);
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
                accept=".pdf"
                className="hidden"
                id={`replace-${document.id}`}
              />
              <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => {
                window.document.getElementById(`replace-${document.id}`)?.click();
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
                    {isRemoving ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Trash2 className="h-3 w-3" />
                    )}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>¿Eliminar documento?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta acción eliminará permanentemente "{document.fileName}". 
                      No se puede deshacer.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => {
                        handleRemoveDocument(document.id);
                      }}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Eliminar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>

          {/* Right column: Preview Section */}
          <div className="flex-shrink-0">
            <DocumentPreview
              documentUrl={document.url}
              fileName={document.fileName}
              className="w-32 h-32"
              onClick={async () => {
                try {
                  if (document.url.startsWith('blob:')) {
                    window.open(document.url, '_blank');
                    return;
                  }
                  if (document.url.includes('supabase.co/storage/v1/object/public/')) {
                    window.open(document.url, '_blank');
                    return;
                  }

                  let storageFilePath = document.url;
                  if (document.url.includes('/load-documents/')) {
                    storageFilePath = document.url.split('/load-documents/')[1];
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
                  console.error('Error opening document:', error);
                  showError("Error", "Error inesperado al abrir el documento");
                }
              }}
            />
          </div>
        </div>
      </div>
    );
  };

  const renderDocumentManagement = () => {
    // Get all documents except load_photos which has its own section
    const allDocuments = [...documents, ...temporaryDocuments];
    const regularDocuments = allDocuments.filter(doc => doc.type !== 'load_photos');
    const loadPhotos = allDocuments.filter(doc => doc.type === 'load_photos') as Array<LoadDocument & { type: 'load_photos' }>;

    // Group documents by type to handle duplicates
    const documentGroups = regularDocuments.reduce((groups, doc) => {
      if (!groups[doc.type]) {
        groups[doc.type] = [];
      }
      groups[doc.type].push(doc);
      return groups;
    }, {} as Record<string, LoadDocument[]>);

    // Sort document types for consistent display order
    const sortedDocumentTypes = Object.keys(documentGroups).sort((a, b) => {
      const aIndex = documentTypes.findIndex(dt => dt.type === a);
      const bIndex = documentTypes.findIndex(dt => dt.type === b);
      return aIndex - bIndex;
    });

    return (
      <div className="space-y-6">
        {/* Upload Controls */}
        <div className="flex flex-col sm:flex-row gap-3 p-4 bg-muted/30 rounded-lg">
          <div className="flex-1">
            <DropdownMenu open={showUploadDropdown} onOpenChange={setShowUploadDropdown}>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="default" 
                  className="w-full justify-between"
                  disabled={getAvailableDocumentTypes().length === 0}
                >
                  <div className="flex items-center gap-2">
                    <Upload className="h-4 w-4" />
                    {getAvailableDocumentTypes().length === 0 
                      ? 'Todos los documentos han sido subidos' 
                      : 'Subir documento'
                    }
                  </div>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-80">
                {getAvailableDocumentTypes().map((docType) => (
                  <DropdownMenuItem 
                    key={docType.type}
                    onClick={() => handleUploadClick(docType.type)}
                    className="cursor-pointer flex items-center justify-between"
                  >
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{docType.label}</span>
                        {docType.required && (
                          <Badge variant="destructive" className="text-[10px] h-4 px-1">
                            Requerido
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {docType.description}
                      </span>
                    </div>
                    <Upload className="h-4 w-4" />
                  </DropdownMenuItem>
                ))}
                {getAvailableDocumentTypes().length === 0 && (
                  <DropdownMenuItem disabled>
                    <span className="text-muted-foreground">
                      No hay documentos disponibles para subir
                    </span>
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => {
                console.log('🔄 Load Order button clicked');
                console.log('📄 Load data:', loadData);
                console.log('✅ Can generate:', canGenerateLoadOrder(loadData));
                setShowGenerateLoadOrder(true);
              }}
              disabled={uploading !== null || !canGenerateLoadOrder(loadData)}
              variant="outline"
              title={canGenerateLoadOrder(loadData) ? "Generar Load Order" : "Faltan datos de la carga o paradas para generar el Load Order"}
            >
              <FileText className="h-4 w-4 mr-2" />
              Generar Load Order
            </Button>
          </div>
        </div>

        {/* Dynamic Document Containers */}
        {sortedDocumentTypes.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {sortedDocumentTypes.map(docType => {
              const docs = documentGroups[docType];
              const documentTypeDef = documentTypes.find(dt => dt.type === docType);
              
              return docs.map((doc, index) => (
                <div key={`${docType}-${index}`}>
                  {renderDocumentCard(documentTypeDef!, doc)}
                </div>
              ));
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No hay documentos subidos aún</p>
            <p className="text-sm">Usa el selector arriba para subir documentos</p>
          </div>
        )}

        {/* Load Photos Section */}
        <LoadPhotosSection
          loadId={loadId}
          loadData={loadData}
          loadPhotos={loadPhotos}
          onPhotosChange={onDocumentsChange}
          user={user}
          onReloadDocuments={loadDocuments}
        />
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
