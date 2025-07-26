import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { FileText, Upload, Download, Trash2, FileCheck, Plus, Eye, RotateCcw } from "lucide-react";
import { GenerateLoadOrderDialog } from "./GenerateLoadOrderDialog";
import { supabase } from "@/integrations/supabase/client";
import { useFleetNotifications } from "@/components/notifications";
import { useQueryClient } from "@tanstack/react-query";
import { useLoadDocuments } from "@/contexts/LoadDocumentsContext";

interface LoadDocument {
  id: string;
  type: 'rate_confirmation' | 'driver_instructions' | 'bol' | 'load_order';
  name: string;
  fileName: string;
  fileSize?: number;
  uploadedAt: Date | string;
  url: string;
}

interface LoadDocumentsSectionProps {
  loadId?: string;
  loadNumber?: string; // Added for backward compatibility
  loadData?: any;
  documents?: LoadDocument[];
  temporaryDocuments?: LoadDocument[];
  onDocumentsChange?: (documents: LoadDocument[]) => void;
  onTemporaryDocumentsChange?: (documents: LoadDocument[]) => void;
  isDialogMode?: boolean;
  onOpenChange?: (open: boolean) => void;
  onClose?: () => void; // Added for backward compatibility
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
    generated: false
  },
  {
    type: 'driver_instructions' as const,
    label: 'Driver Instructions',
    description: 'Instrucciones específicas para el conductor',
    required: false,
    generated: false
  },
  {
    type: 'bol' as const,
    label: 'Bill of Lading',
    description: 'Documento de embarque',
    required: false,
    generated: false
  },
  {
    type: 'load_order' as const,
    label: 'Load Order',
    description: 'Orden de carga generada automáticamente',
    required: false,
    generated: true
  }
];

export function LoadDocumentsSection({
  loadId,
  loadData,
  documents: propDocuments = [],
  temporaryDocuments = [],
  onDocumentsChange,
  onTemporaryDocumentsChange,
  isDialogMode = false,
  onOpenChange,
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
    if (propDocuments) {
      setDocuments(propDocuments);
    }
  }, [propDocuments]);

  const loadDocuments = async () => {
    if (!loadId || loadId === 'temp') return;

    try {
      console.log('🔄 LoadDocumentsSection - Loading documents for load:', loadId);
      
      const { data: loadDocuments, error } = await supabase
        .from('load_documents')
        .select('*')
        .eq('load_id', loadId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ LoadDocumentsSection - Error loading documents:', error);
        throw error;
      }

      console.log('✅ LoadDocumentsSection - Documents loaded:', loadDocuments?.length || 0);

      const formattedDocuments: LoadDocument[] = (loadDocuments || []).map(doc => ({
        id: doc.id,
        type: doc.document_type as LoadDocument['type'],
        name: documentTypes.find(dt => dt.type === doc.document_type)?.label || doc.document_type,
        fileName: doc.file_name,
        fileSize: doc.file_size || undefined,
        uploadedAt: doc.created_at,
        url: doc.file_url
      }));

      setDocuments(formattedDocuments);
      onDocumentsChange?.(formattedDocuments);
    } catch (error) {
      console.error('Error loading documents:', error);
      showError("Error", "No se pudieron cargar los documentos");
    }
  };

  const handleFileUpload = async (file: File, documentType: LoadDocument['type'], isReplacement = false) => {
    if (!loadId || loadId === 'temp') {
      return handleTemporaryFileUpload(file, documentType);
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      showError("Error", "El archivo es muy grande. Máximo 10MB permitido.");
      return;
    }

    setUploading(documentType);
    setUploadingDocuments(prev => new Set([...prev, documentType]));

    try {
      console.log('🔄 LoadDocumentsSection - Starting file upload:', {
        fileName: file.name,
        fileSize: file.size,
        documentType,
        loadId,
        isReplacement
      });

      // Get user info for folder structure
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('Usuario no autenticado');
      }

      // Create unique file name with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileExtension = file.name.split('.').pop();
      const fileName = `${documentType}_${loadData?.load_number || loadId}_${timestamp}.${fileExtension}`;
      const filePath = `load-documents/${user.id}/${loadId}/${fileName}`;

      console.log('📁 LoadDocumentsSection - Upload path:', filePath);

      // If it's a replacement, find and remove the old document
      let existingDocId = null;
      if (isReplacement) {
        const existingDoc = documents.find(doc => doc.type === documentType);
        if (existingDoc) {
          existingDocId = existingDoc.id;
          // Remove old file from storage
          const oldFilePath = existingDoc.url.split('/').slice(-4).join('/');
          await supabase.storage
            .from('documents')
            .remove([oldFilePath]);
        }
      }

      // Upload file to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('❌ LoadDocumentsSection - Storage upload error:', uploadError);
        throw uploadError;
      }

      console.log('✅ LoadDocumentsSection - File uploaded to storage:', uploadData.path);

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('documents')
        .getPublicUrl(uploadData.path);

      const publicUrl = urlData.publicUrl;
      console.log('🔗 LoadDocumentsSection - Public URL generated:', publicUrl);

      // Save document info to database
      const documentData = {
        load_id: loadId,
        document_type: documentType,
        file_name: file.name,
        file_size: file.size,
        file_url: publicUrl
      };

      let result;
      if (isReplacement && existingDocId) {
        // Update existing record
        result = await supabase
          .from('load_documents')
          .update(documentData)
          .eq('id', existingDocId)
          .select()
          .single();
      } else {
        // Insert new record
        result = await supabase
          .from('load_documents')
          .insert(documentData)
          .select()
          .single();
      }

      if (result.error) {
        console.error('❌ LoadDocumentsSection - Database insert error:', result.error);
        throw result.error;
      }

      console.log('✅ LoadDocumentsSection - Document saved to database:', result.data);

      const newDocument: LoadDocument = {
        id: result.data.id,
        type: documentType,
        name: documentTypes.find(dt => dt.type === documentType)?.label || documentType,
        fileName: result.data.file_name,
        fileSize: result.data.file_size,
        uploadedAt: result.data.created_at,
        url: result.data.file_url
      };

      // Update documents list
      let updatedDocuments;
      if (isReplacement) {
        updatedDocuments = documents.map(doc => 
          doc.type === documentType ? newDocument : doc
        );
      } else {
        updatedDocuments = [...documents, newDocument];
      }

      setDocuments(updatedDocuments);
      onDocumentsChange?.(updatedDocuments);

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['load-documents', loadId] });
      
      // Notify context about the change
      notifyDocumentChange();

      showSuccess("Éxito", `${newDocument.name} subido correctamente`);

    } catch (error) {
      console.error('Error uploading document:', error);
      showError("Error", "No se pudo subir el documento. Intenta nuevamente.");
    } finally {
      setUploading(null);
      setUploadingDocuments(prev => {
        const newSet = new Set(prev);
        newSet.delete(documentType);
        return newSet;
      });
    }
  };

  const handleTemporaryFileUpload = async (file: File, documentType: LoadDocument['type']) => {
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      showError("Error", "El archivo es demasiado grande. Máximo 50MB.");
      return;
    }

    setUploading(documentType);

    try {
      // Create a temporary document that will be saved later
      const tempDocument: LoadDocument = {
        id: crypto.randomUUID(),
        type: documentType,
        name: documentTypes.find(dt => dt.type === documentType)?.label || documentType,
        fileName: file.name,
        fileSize: file.size,
        uploadedAt: new Date(),
        url: URL.createObjectURL(file) // Temporary URL
      };

      // Add file reference for later upload
      (tempDocument as any).file = file;

      // Update temporary documents
      const updatedTempDocs = [...temporaryDocuments, tempDocument];
      onTemporaryDocumentsChange?.(updatedTempDocs);

      // Also add to local documents for display
      const updatedDocuments = [...documents, tempDocument];
      setDocuments(updatedDocuments);
      onDocumentsChange?.(updatedDocuments);

      showSuccess("Documento agregado", `${file.name} se subirá cuando guardes la carga.`);
    } finally {
      setUploading(null);
    }
  };

  const handleRemoveTemporaryDocument = (documentId: string) => {
    const updatedTempDocs = temporaryDocuments.filter(doc => doc.id !== documentId);
    onTemporaryDocumentsChange?.(updatedTempDocs);
    
    showSuccess("Documento removido", "El documento temporal ha sido eliminado.");
  };

  const handleRemoveDocument = async (documentId: string) => {
    if (!loadId || loadId === 'temp') {
      // Handle removal of temporary document
      const docToRemove = documents.find(doc => doc.id === documentId);
      if (docToRemove) {
        URL.revokeObjectURL(docToRemove.url); // Clean up blob URL
        const updatedDocuments = documents.filter(doc => doc.id !== documentId);
        setDocuments(updatedDocuments);
        onDocumentsChange?.(updatedDocuments);
        handleRemoveTemporaryDocument(documentId);
      }
      return;
    }

    setRemovingDocuments(prev => new Set([...prev, documentId]));

    try {
      console.log('🔄 LoadDocumentsSection - Removing document:', documentId);

      // Get document info first
      const { data: documentData, error: fetchError } = await supabase
        .from('load_documents')
        .select('file_url')
        .eq('id', documentId)
        .single();

      if (fetchError) {
        console.error('❌ LoadDocumentsSection - Error fetching document for removal:', fetchError);
        throw fetchError;
      }

      // Remove from storage by extracting path from URL
      if (documentData.file_url) {
        try {
          const urlPath = new URL(documentData.file_url).pathname;
          const filePath = urlPath.split('/documents/')[1]; // Extract the path after /documents/
          if (filePath) {
            const { error: storageError } = await supabase.storage
              .from('documents')
              .remove([filePath]);

            if (storageError) {
              console.error('❌ LoadDocumentsSection - Error removing from storage:', storageError);
              // Continue with database removal even if storage fails
            }
          }
        } catch (urlError) {
          console.error('❌ LoadDocumentsSection - Error parsing URL for storage removal:', urlError);
          // Continue with database removal even if storage fails
        }
      }

      // Remove from database
      const { error: dbError } = await supabase
        .from('load_documents')
        .delete()
        .eq('id', documentId);

      if (dbError) {
        console.error('❌ LoadDocumentsSection - Error removing from database:', dbError);
        throw dbError;
      }

      console.log('✅ LoadDocumentsSection - Document removed successfully');

      // Update local state
      const updatedDocuments = documents.filter(doc => doc.id !== documentId);
      setDocuments(updatedDocuments);
      onDocumentsChange?.(updatedDocuments);

      // Invalidate queries and notify context
      queryClient.invalidateQueries({ queryKey: ['load-documents', loadId] });
      notifyDocumentChange();

      // Reload documents to ensure sync
      setTimeout(() => loadDocuments(), 100);

      showSuccess("Éxito", "Documento eliminado correctamente");

    } catch (error) {
      console.error('Error removing document:', error);
      showError("Error", "No se pudo eliminar el documento");
    } finally {
      setRemovingDocuments(prev => {
        const newSet = new Set(prev);
        newSet.delete(documentId);
        return newSet;
      });
    }
  };

  const handleLoadOrderGenerated = async (loadOrderData: { url: string; fileName: string }) => {
    console.log('🔄 LoadDocumentsSection - Processing Load Order generation:', loadOrderData);

    if (loadId && loadId !== 'temp') {
      console.log('🔄 LoadDocumentsSection - Saving Load Order to database for existing load:', loadId);
      
      try {
        // Convert blob URL to actual blob for upload
        const response = await fetch(loadOrderData.url);
        const blob = await response.blob();
        
        // Get user info for folder structure
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
          throw new Error('Usuario no autenticado');
        }

        // Create file path
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fileName = `load_order_${loadData?.load_number || loadId}_${timestamp}.pdf`;
        const filePath = `load-documents/${user.id}/${loadId}/${fileName}`;

        console.log('📁 LoadDocumentsSection - Upload path for Load Order:', filePath);

        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('documents')
          .upload(filePath, blob, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          console.error('❌ LoadDocumentsSection - Storage upload error for Load Order:', uploadError);
          throw uploadError;
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('documents')
          .getPublicUrl(uploadData.path);

        const publicUrl = urlData.publicUrl;

        // Save to database
        const { data: dbData, error: dbError } = await supabase
          .from('load_documents')
          .insert({
            load_id: loadId,
            document_type: 'load_order',
            file_name: loadOrderData.fileName,
            file_size: blob.size,
            file_url: publicUrl
          })
          .select()
          .single();

        if (dbError) {
          console.error('❌ LoadDocumentsSection - Database insert error for Load Order:', dbError);
          throw dbError;
        }

        console.log('✅ LoadDocumentsSection - Load Order saved to database:', dbData);

        // Update local state
        const newDocument: LoadDocument = {
          id: dbData.id,
          type: 'load_order',
          name: 'Load Order',
          fileName: dbData.file_name,
          fileSize: dbData.file_size,
          uploadedAt: dbData.created_at,
          url: dbData.file_url
        };

        const updatedDocuments = [...documents, newDocument];
        setDocuments(updatedDocuments);
        setHasLoadOrder(true);
        onDocumentsChange?.(updatedDocuments);

        // Invalidate queries and notify context
        queryClient.invalidateQueries({ queryKey: ['load-documents', loadId] });
        notifyDocumentChange();
        
        showSuccess("Load Order guardado", "El Load Order se ha guardado automáticamente en Storage y la base de datos");

        // Clean up the temporary blob URL
        URL.revokeObjectURL(loadOrderData.url);
        
      } catch (error) {
        console.error('❌ LoadDocumentsSection - Error saving Load Order:', error);
        showError("Error", "No se pudo guardar el Load Order. Intenta nuevamente.");
      }
    } else {
      console.log('🔄 LoadDocumentsSection - Processing temporary Load Order for wizard mode');
      
      try {
        // For temporary loads, convert blob URL to a proper blob with file size
        const response = await fetch(loadOrderData.url);
        const blob = await response.blob();
        
        const loadOrderDocument: LoadDocument = {
          id: crypto.randomUUID(),
          type: 'load_order',
          name: 'Load Order',
          fileName: `Load_Order_${loadData?.load_number || 'unknown'}.pdf`,
          fileSize: blob.size,
          uploadedAt: new Date(),
          url: loadOrderData.url
        };

        // Add file reference for later upload
        (loadOrderDocument as any).file = blob;

        // Update temporary documents
        const updatedTempDocs = [...temporaryDocuments, loadOrderDocument];
        onTemporaryDocumentsChange?.(updatedTempDocs);

        const updatedDocuments = [...documents, loadOrderDocument];
        setDocuments(updatedDocuments);
        setHasLoadOrder(true);
        onDocumentsChange?.(updatedDocuments);
        
        showSuccess("Load Order generado", `Load Order creado (${(blob.size / 1024 / 1024).toFixed(2)} MB). Se guardará al crear la carga.`);
        
      } catch (error) {
        console.error('❌ Error processing temporary Load Order:', error);
        // Fallback without file size
        const loadOrderDocument: LoadDocument = {
          id: crypto.randomUUID(),
          type: 'load_order',
          name: 'Load Order',
          fileName: `Load_Order_${loadData?.load_number || 'unknown'}.pdf`,
          uploadedAt: new Date(),
          url: loadOrderData.url
        };

        const updatedTempDocs = [...temporaryDocuments, loadOrderDocument];
        onTemporaryDocumentsChange?.(updatedTempDocs);

        const updatedDocuments = [...documents, loadOrderDocument];
        setDocuments(updatedDocuments);
        setHasLoadOrder(true);
        onDocumentsChange?.(updatedDocuments);
        
        showSuccess("Load Order generado", "Load Order creado. Se guardará al crear la carga.");
      }
    }

    setShowGenerateLoadOrder(false);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>, documentType: LoadDocument['type']) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      showError("Error", "El archivo es muy grande. Máximo 10MB permitido.");
      return;
    }

    const existingDoc = documents.find(doc => doc.type === documentType);
    const isReplacement = !!existingDoc;

    handleFileUpload(file, documentType, isReplacement);
    
    // Reset the input
    event.target.value = '';
  };

  const handleReplaceDocument = (event: React.ChangeEvent<HTMLInputElement>, documentType: LoadDocument['type']) => {
    const file = event.target.files?.[0];
    if (!file) return;

    handleFileUpload(file, documentType, true);
    
    // Reset the input
    event.target.value = '';
  };

  const renderDocumentManagement = () => {
    const allDocuments = [...documents, ...temporaryDocuments];
    
    return (
      <div className="space-y-6">
        <div className="grid gap-4">
          {documentTypes.map((docType) => {
            const existingDoc = allDocuments.find(doc => doc.type === docType.type);
            const isUploading = uploadingDocuments.has(docType.type) || uploading === docType.type;
            const isRemoving = existingDoc ? removingDocuments.has(existingDoc.id) : false;

            return (
              <div key={docType.type} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{docType.label}</span>
                      {docType.required && <Badge variant="destructive" className="text-xs">Requerido</Badge>}
                      {docType.generated && <Badge variant="secondary" className="text-xs">Generado</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground">{docType.description}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {existingDoc ? (
                    <>
                      <div className="flex flex-col items-end mr-2">
                        <span className="text-sm font-medium">{existingDoc.fileName}</span>
                        <span className="text-xs text-muted-foreground">
                          {existingDoc.fileSize ? `${(existingDoc.fileSize / 1024 / 1024).toFixed(2)} MB` : 'Tamaño desconocido'}
                        </span>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => {
                          if (!existingDoc.url) {
                            showError("Error", "No se pudo encontrar la URL del documento");
                            return;
                          }
                          window.open(existingDoc.url, '_blank');
                        }}
                        title="Ver documento"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="h-8 w-8"
                        onClick={async () => {
                          if (!existingDoc.url) {
                            showError("Error", "No se pudo encontrar la URL del documento para descargar");
                            return;
                          }
                          
                          try {
                            const response = await fetch(existingDoc.url);
                            if (!response.ok) {
                              throw new Error(`HTTP error! status: ${response.status}`);
                            }
                            
                            const blob = await response.blob();
                            const blobUrl = window.URL.createObjectURL(blob);
                            const link = document.createElement('a');
                            link.href = blobUrl;
                            link.download = existingDoc.fileName;
                            link.style.display = 'none';
                            
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                            
                            window.URL.revokeObjectURL(blobUrl);
                            
                            showSuccess("Descarga iniciada", `${existingDoc.fileName} se está descargando`);
                          } catch (error) {
                            console.error('Error downloading document:', error);
                            showError("Error", "No se pudo descargar el documento");
                          }
                        }}
                        title="Descargar documento"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      
                      {!docType.generated && (
                        <>
                          <label htmlFor={`replace-${docType.type}`}>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              className="h-8 w-8"
                              disabled={isUploading}
                              title="Reemplazar documento"
                              asChild
                            >
                              <span>
                                <RotateCcw className="h-4 w-4" />
                              </span>
                            </Button>
                          </label>
                          <input
                            id={`replace-${docType.type}`}
                            type="file"
                            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                            onChange={(e) => handleReplaceDocument(e, docType.type)}
                            className="hidden"
                          />
                          
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                disabled={isRemoving}
                                title="Eliminar documento"
                              >
                                <Trash2 className="h-4 w-4" />
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
                                  onClick={() => handleRemoveDocument(existingDoc.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Eliminar
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </>
                      )}
                    </>
                  ) : (
                    <>
                      {docType.generated && docType.type === 'load_order' ? (
                        <Button 
                          onClick={() => setShowGenerateLoadOrder(true)}
                          disabled={hasLoadOrder || !canGenerate}
                          className="flex items-center gap-2"
                        >
                          <Plus className="h-4 w-4" />
                          Generar Load Order
                        </Button>
                      ) : (
                        <>
                          <label htmlFor={`upload-${docType.type}`}>
                            <Button 
                              variant="outline" 
                              disabled={isUploading}
                              className="flex items-center gap-2"
                              asChild
                            >
                              <span>
                                <Upload className="h-4 w-4" />
                                {isUploading ? 'Subiendo...' : 'Subir'}
                              </span>
                            </Button>
                          </label>
                          <input
                            id={`upload-${docType.type}`}
                            type="file"
                            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                            onChange={(e) => handleFileSelect(e, docType.type)}
                            className="hidden"
                          />
                        </>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary */}
        <div className="pt-4 border-t">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Documentos subidos: {allDocuments.length} de {documentTypes.length}
            </span>
            <div className="flex items-center gap-2">
              {allDocuments.filter(doc => 
                documentTypes.find(dt => dt.type === doc.type)?.required
              ).length > 0 && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <FileCheck className="h-3 w-3" />
                  Documentos requeridos completados
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Additional Documents Section */}
        <div className="space-y-4">
          <h4 className="font-medium">Documentos adicionales</h4>
          <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
            <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground mb-2">
              Arrastra archivos aquí o haz clic para subir documentos adicionales
            </p>
            <label htmlFor="additional-upload">
              <Button variant="outline" size="sm" asChild>
                <span>Seleccionar archivos</span>
              </Button>
            </label>
            <input
              id="additional-upload"
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              onChange={(e) => {
                const files = Array.from(e.target.files || []);
                files.forEach(file => {
                  // For additional documents, we'll use a generic type
                  // You might want to add a new document type for this
                  handleFileUpload(file, 'driver_instructions'); // Using driver_instructions as fallback
                });
                e.target.value = '';
              }}
              className="hidden"
            />
          </div>
        </div>

        {/* Additional uploaded documents */}
        {allDocuments.filter(doc => !documentTypes.some(dt => dt.type === doc.type)).length > 0 && (
          <div className="space-y-2">
            <h5 className="font-medium text-sm">Documentos adicionales subidos</h5>
            {allDocuments
              .filter(doc => !documentTypes.some(dt => dt.type === doc.type))
              .map(doc => (
                <div key={doc.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <span className="text-sm font-medium">{doc.fileName}</span>
                      <div className="text-xs text-muted-foreground">
                        {doc.fileSize ? `${(doc.fileSize / 1024 / 1024).toFixed(2)} MB` : 'Tamaño desconocido'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => {
                        if (!doc.url) {
                          showError("Error", "No se pudo encontrar la URL del documento");
                          return;
                        }
                        window.open(doc.url, '_blank');
                      }}
                      title="Ver documento"
                    >
                      <Eye className="h-3 w-3" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="h-6 w-6"
                      onClick={async () => {
                        if (!doc.url) {
                          showError("Error", "No se pudo encontrar la URL del documento para descargar");
                          return;
                        }
                        
                        try {
                          const response = await fetch(doc.url);
                          if (!response.ok) {
                            throw new Error(`HTTP error! status: ${response.status}`);
                          }
                          
                          const blob = await response.blob();
                          const blobUrl = window.URL.createObjectURL(blob);
                          const link = document.createElement('a');
                          link.href = blobUrl;
                          link.download = doc.fileName;
                          link.style.display = 'none';
                          
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                          
                          window.URL.revokeObjectURL(blobUrl);
                          
                          showSuccess("Descarga iniciada", `${doc.fileName} se está descargando`);
                        } catch (error) {
                          console.error('Error downloading document:', error);
                          showError("Error", "No se pudo descargar el documento");
                        }
                      }}
                      title="Descargar documento"
                    >
                      <Download className="h-3 w-3" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="h-6 w-6 text-destructive hover:text-destructive"
                          title="Eliminar documento"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>¿Eliminar documento?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta acción eliminará permanentemente "{doc.fileName}". 
                            No se puede deshacer.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleRemoveDocument(doc.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Eliminar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    );
  };

  if (isDialogMode) {
    return (
      <>
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Documentos de la Carga</DialogTitle>
            </DialogHeader>
            {renderDocumentManagement()}
          </DialogContent>
        </Dialog>

        <GenerateLoadOrderDialog
          isOpen={showGenerateLoadOrder}
          onClose={() => setShowGenerateLoadOrder(false)}
          loadData={loadData}
          onLoadOrderGenerated={(data) => handleLoadOrderGenerated({ 
            url: data.url, 
            fileName: `Load_Order_${loadData?.load_number || 'unknown'}.pdf` 
          })}
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
        onLoadOrderGenerated={(data) => handleLoadOrderGenerated({ 
          url: data.url, 
          fileName: `Load_Order_${loadData?.load_number || 'unknown'}.pdf` 
        })}
      />
    </>
  );
}