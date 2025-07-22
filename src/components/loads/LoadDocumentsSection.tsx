import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { FileText, Upload, Download, Trash2, FileCheck, Plus, Eye, RotateCcw } from "lucide-react";
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
    client_name?: string;
    driver_name?: string;
    loadStops: any[];
    company_name?: string;
    company_phone?: string;
    company_email?: string;
  };
  onDocumentsChange?: (documents: LoadDocument[]) => void;
  temporaryDocuments?: LoadDocument[];
  onTemporaryDocumentsChange?: (documents: LoadDocument[]) => void;
  
  // Dialog mode props
  isDialogMode?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
  loadNumber?: string;
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
  },
  {
    type: 'load_order' as const,
    label: 'Load Order',
    description: 'Documento personalizado para el conductor',
    required: false,
    color: 'default',
    isGenerated: true // Flag to distinguish generated docs
  }
];

export function LoadDocumentsSection({ 
  loadId, 
  loadData, 
  onDocumentsChange,
  temporaryDocuments = [],
  onTemporaryDocumentsChange,
  // Dialog mode props
  isDialogMode = false,
  isOpen = false,
  onClose,
  loadNumber
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

  // Load existing documents when loadId is available (both modes)
  useEffect(() => {
    if (loadId && (isDialogMode || !isDialogMode)) {
      loadDocuments();
    }
  }, [loadId, isDialogMode, isOpen]);

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
      
      console.log('📋 LoadDocumentsSection - Documents loaded:', {
        total: loadDocuments.length,
        types: loadDocuments.map(d => d.type),
        hasLoadOrder: loadDocuments.some(doc => doc.type === 'load_order'),
        loadOrderDoc: loadDocuments.find(doc => doc.type === 'load_order')
      });
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
      // Generate custom file name based on load number and document type
      const fileExt = file.name.split('.').pop();
      const loadNumber = loadData?.load_number || 'UNKNOWN';
      
      // Map document types to custom names
      const documentNameMap: Record<string, string> = {
        'rate_confirmation': 'Rate_Confirmation',
        'driver_instructions': 'Driver_Instructions', 
        'bol': 'Bill_of_Lading',
        'load_order': 'Load_Order'
      };
      
      const customName = documentNameMap[type];
      const timestamp = Date.now();
      let fileName = customName 
        ? `${loadNumber}_${customName}_${timestamp}.${fileExt}`
        : `${type}_${timestamp}.${fileExt}`;
      
      let filePath = `${loadId}/${fileName}`;

      // Upload file to Supabase Storage
      let uploadData, uploadError;
      
      // First try with upsert to replace existing files
      ({ data: uploadData, error: uploadError } = await supabase.storage
        .from('load-documents')
        .upload(filePath, file, {
          upsert: true
        }));

      // If still getting duplicate error, try with a new unique name
      if (uploadError?.message?.includes('already exists') || uploadError?.message?.includes('Duplicate')) {
        console.log('🔄 File exists, trying with unique name...');
        const uniqueTimestamp = Date.now() + Math.random().toString(36).substr(2, 9);
        const uniqueFileName = customName 
          ? `${loadNumber}_${customName}_${uniqueTimestamp}.${fileExt}`
          : `${type}_${uniqueTimestamp}.${fileExt}`;
        const uniqueFilePath = `${loadId}/${uniqueFileName}`;
        
        ({ data: uploadData, error: uploadError } = await supabase.storage
          .from('load-documents')
          .upload(uniqueFilePath, file));
          
        // Update the file path and name for the rest of the process
        if (!uploadError) {
          filePath = uniqueFilePath;
          fileName = uniqueFileName;
        }
      }

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('load-documents')
        .getPublicUrl(filePath);

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('Usuario no autenticado');
      }

      // Save document metadata to database
      const { data: docData, error: docError } = await supabase
        .from('load_documents')
        .insert({
          load_id: loadId,
          document_type: type,
          file_name: fileName,
          file_url: urlData.publicUrl,
          file_size: file.size,
          content_type: file.type,
          uploaded_by: user.id
        })
        .select()
        .single();

      if (docError) {
        console.error('Database insert error:', docError);
        throw docError;
      }

      // Add to local state
      const newDocument: LoadDocument = {
        id: docData.id,
        type,
        name: documentTypes.find(dt => dt.type === type)?.label || type,
        fileName: fileName, // Use custom file name instead of original
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
    console.log('📂 Current temporaryDocuments BEFORE:', temporaryDocuments);
    console.log('📂 onTemporaryDocumentsChange callback exists:', !!onTemporaryDocumentsChange);
    
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
    console.log('📂 Updated temporaryDocuments AFTER:', updatedTempDocs);
    
    // Call the callback to update parent state
    console.log('📂 Calling onTemporaryDocumentsChange with:', updatedTempDocs);
    onTemporaryDocumentsChange?.(updatedTempDocs);

    // Also update local documents state for immediate UI feedback
    const updatedDocuments = [...documents, tempDocument];
    console.log('📂 Updating local documents state:', updatedDocuments);
    setDocuments(updatedDocuments);
    onDocumentsChange?.(updatedDocuments);

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
      // Get document info before deleting
      const { data: documentData, error: fetchError } = await supabase
        .from('load_documents')
        .select('file_url')
        .eq('id', documentId)
        .single();

      if (fetchError) throw fetchError;

      // Extract file path from URL to delete from Storage
      if (documentData?.file_url) {
        const url = new URL(documentData.file_url);
        const pathParts = url.pathname.split('/');
        const bucketIndex = pathParts.findIndex(part => part === 'load-documents');
        if (bucketIndex !== -1 && bucketIndex < pathParts.length - 1) {
          const filePath = pathParts.slice(bucketIndex + 1).join('/');
          
          // Delete file from Storage
          const { error: storageError } = await supabase.storage
            .from('load-documents')
            .remove([filePath]);

          if (storageError) {
            console.error('Error deleting file from storage:', storageError);
          }
        }
      }

      // Delete document record from database (hard delete)
      const { error } = await supabase
        .from('load_documents')
        .delete()
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

  const handleLoadOrderGenerated = async (loadOrderData: any) => {
    console.log('📋 LoadDocumentsSection - handleLoadOrderGenerated called with:', loadOrderData);
    console.log('📋 Current documents before Load Order:', documents);
    console.log('📋 Current temporaryDocuments before Load Order:', temporaryDocuments);

    // Si tenemos loadId, guardar automáticamente en la BD y Storage
    if (loadId) {
      try {
        console.log('💾 LoadDocumentsSection - Uploading Load Order to storage...');
        
        // Convert blob URL to actual file
        const response = await fetch(loadOrderData.url);
        const blob = await response.blob();
        const loadNumber = loadData?.load_number || 'UNKNOWN';
        const fileName = `${loadNumber}_Load_Order.pdf`;
        const file = new File([blob], fileName, { type: 'application/pdf' });
        
        // Create file path using the custom name
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

        console.log('🔗 LoadDocumentsSection - Storage URL:', urlData.publicUrl);
        
        // Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
          throw new Error('Usuario no autenticado');
        }
        
        const { data: docData, error: docError } = await supabase
          .from('load_documents')
          .insert({
            load_id: loadId,
            document_type: 'load_order',
            file_name: fileName,
            file_url: urlData.publicUrl, // Use the permanent Storage URL
            file_size: file.size,
            content_type: 'application/pdf',
            uploaded_by: user.id
          })
          .select()
          .single();

        if (docError) {
          console.error('Database insert error for Load Order:', docError);
          throw docError;
        }

        console.log('✅ LoadDocumentsSection - Load Order saved to database with permanent URL:', urlData.publicUrl);
        
        // Refresh documents from database to get the updated list
        await loadDocuments();
        
        toast({
          title: "Load Order guardado",
          description: "El Load Order se ha guardado automáticamente en Storage y la base de datos",
        });

        // Clean up the temporary blob URL
        URL.revokeObjectURL(loadOrderData.url);
        
      } catch (error) {
        console.error('❌ LoadDocumentsSection - Error saving Load Order:', error);
        toast({
          title: "Error",
          description: "No se pudo guardar el Load Order. Intenta nuevamente.",
          variant: "destructive",
        });
      }
    } else {
      // En modo creación, agregar como documento temporal
      console.log('📂 LoadDocumentsSection - Adding Load Order as temporary document');
      
      // Convert blob URL to get file size for temporary document
      try {
        const response = await fetch(loadOrderData.url);
        const blob = await response.blob();
        const loadNumber = loadData?.load_number || 'UNKNOWN';
        const fileName = `${loadNumber}_Load_Order.pdf`;
        
        const loadOrderDocument: LoadDocument = {
          id: crypto.randomUUID(),
          type: 'load_order',
          name: 'Load Order',
          fileName: fileName,
          fileSize: blob.size, // Include file size for temporary documents
          uploadedAt: new Date(),
          url: loadOrderData.url // Keep blob URL for temporary documents
        };

        console.log('📂 LoadDocumentsSection - Temporary Load Order with size:', loadOrderDocument);

        console.log('📂 Before updating temporaryDocuments:', temporaryDocuments);
        const updatedTempDocs = [...temporaryDocuments, loadOrderDocument];
        console.log('📂 After creating updatedTempDocs:', updatedTempDocs);
        onTemporaryDocumentsChange?.(updatedTempDocs);

        console.log('📂 Before updating documents state:', documents);
        // Include both existing documents AND temporary documents
        const allCurrentDocuments = [...documents, ...temporaryDocuments.filter(td => td.type !== 'load_order')];
        const updatedDocuments = [...allCurrentDocuments, loadOrderDocument];
        console.log('📂 After creating updatedDocuments:', updatedDocuments);
        setDocuments(updatedDocuments);
        setHasLoadOrder(true);
        onDocumentsChange?.(updatedDocuments);
        
        toast({
          title: "Load Order generado",
          description: `Load Order creado (${(blob.size / 1024 / 1024).toFixed(2)} MB). Se guardará al crear la carga.`,
        });
        
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
        
        toast({
          title: "Load Order generado",
          description: "Load Order creado. Se guardará al crear la carga.",
        });
      }
    }
    
    console.log('✅ LoadDocumentsSection - Load Order processing completed');
  };

  // Dialog mode specific functions
  const handleFileUploadWithReplacement = async (type: LoadDocument['type'], files: FileList | null, isReplacement = false) => {
    if (!files || files.length === 0 || !loadId) return;

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
      // If replacing, first remove the existing document
      if (isReplacement) {
        const existingDoc = documents.find(doc => doc.type === type);
        if (existingDoc) {
          await handleRemoveDocument(existingDoc.id);
        }
      }

      // Create file path: load_id/document_type.ext
      const fileExt = file.name.split('.').pop();
      const fileName = `${type}.${fileExt}`;
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

      // Reload documents to get updated list
      await loadDocuments();

      toast({
        title: "Éxito",
        description: `${file.name} ${isReplacement ? 'reemplazado' : 'subido'} correctamente`,
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

  const handleRemoveDocumentForDialog = async (documentId: string) => {
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

      // Reload documents to get updated list
      await loadDocuments();

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

  // Helper functions
  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    const mb = bytes / 1024 / 1024;
    return `${mb.toFixed(2)} MB`;
  };

  const getDocumentStatus = (type: LoadDocument['type']) => {
    const hasDoc = documents.some(doc => doc.type === type) || temporaryDocuments.some(doc => doc.type === type);
    const docType = documentTypes.find(dt => dt.type === type);
    
    if (hasDoc) {
      return { status: 'uploaded', color: 'default' };
    } else if (docType?.required) {
      return { status: 'required', color: 'destructive' };
    } else {
      return { status: 'optional', color: 'secondary' };
    }
  };

  const renderDocumentManagement = () => (
    <div className="space-y-6">
      {/* Document Upload Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-muted-foreground">
            {isDialogMode ? 'Documentos de la carga' : 'Documentos requeridos'}
          </h4>
        </div>
        
        <div className={isDialogMode ? "grid grid-cols-1 md:grid-cols-2 gap-6" : "space-y-4"}>
          {documentTypes.map((docType) => {
            const status = getDocumentStatus(docType.type);
            const uploadedDoc = documents.find(doc => doc.type === docType.type);
            const tempDoc = temporaryDocuments.find(doc => doc.type === docType.type);
            
            console.log('🔍 Document check for type:', docType.type, { 
              uploadedDoc, 
              hasUrl: !!uploadedDoc?.url,
              url: uploadedDoc?.url,
              fileName: uploadedDoc?.fileName 
            });
            
            if (isDialogMode) {
              // Dialog mode rendering - similar to LoadDocumentsManagementDialog
              return (
                <Card key={docType.type} className="h-fit">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        {docType.label}
                      </CardTitle>
                      <Badge variant={status.color as any}>
                        {status.status === 'uploaded' ? 'Subido' : 
                         status.status === 'required' ? 'Requerido' : 'Opcional'}
                      </Badge>
                    </div>
                    <CardDescription>
                      {docType.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {(uploadedDoc || tempDoc) ? (
                      <div className="space-y-3">
                        {/* Document Info */}
                        <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                          <FileCheck className="h-5 w-5 text-green-500 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{(uploadedDoc || tempDoc)?.fileName}</p>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <span>{formatFileSize((uploadedDoc || tempDoc)?.fileSize)}</span>
                              <span>•</span>
                              <span>
                                {new Date((uploadedDoc || tempDoc)?.uploadedAt || new Date()).toLocaleDateString('es-ES')}
                              </span>
                              {tempDoc && !uploadedDoc && (
                                <Badge variant="secondary" className="text-xs">Temporal</Badge>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              const docToView = uploadedDoc || tempDoc;
                              if (docToView?.url) {
                                window.open(docToView.url, '_blank');
                              }
                            }}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Ver
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              const docToDownload = uploadedDoc || tempDoc;
                              if (docToDownload?.url) {
                                const link = document.createElement('a');
                                link.href = docToDownload.url;
                                link.download = docToDownload.fileName;
                                link.click();
                              }
                            }}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Descargar
                          </Button>
                        </div>

                        {/* Replace Document */}
                        <div className="border-t pt-3">
                          <h5 className="text-sm font-medium mb-2">Reemplazar documento</h5>
                          <div className="flex items-center gap-2">
                            <input
                              type="file"
                              id={`replace-${docType.type}`}
                              className="hidden"
                              accept=".pdf,.jpg,.jpeg,.png"
                              onChange={(e) => handleFileUploadWithReplacement(docType.type, e.target.files, true)}
                              disabled={uploading === docType.type}
                            />
                            <Button 
                              variant="outline" 
                              size="sm"
                              disabled={uploading === docType.type}
                              onClick={() => {
                                const fileInput = document.getElementById(`replace-${docType.type}`) as HTMLInputElement;
                                fileInput?.click();
                              }}
                            >
                              <RotateCcw className="h-4 w-4 mr-2" />
                              {uploading === docType.type ? 'Reemplazando...' : 'Reemplazar'}
                            </Button>
                            
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="outline" size="sm">
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Eliminar
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>¿Eliminar documento?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Esta acción eliminará permanentemente el documento "{uploadedDoc.fileName}". 
                                    No se puede deshacer.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleRemoveDocumentForDialog(uploadedDoc.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Eliminar
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Upload New Document */
                      <div className="space-y-3">
                        <div className="text-center py-6 border-2 border-dashed border-muted rounded-lg">
                          <FileText className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                          <p className="text-sm text-muted-foreground mb-3">
                            Sin documento subido
                          </p>
                          <input
                            type="file"
                            id={`upload-${docType.type}`}
                            className="hidden"
                            accept=".pdf,.jpg,.jpeg,.png"
                            onChange={(e) => handleFileUploadWithReplacement(docType.type, e.target.files)}
                            disabled={uploading === docType.type}
                          />
                          <Button 
                            variant="outline" 
                            size="sm"
                            disabled={uploading === docType.type}
                            onClick={() => {
                              const fileInput = document.getElementById(`upload-${docType.type}`) as HTMLInputElement;
                              fileInput?.click();
                            }}
                          >
                            <Upload className="h-4 w-4 mr-2" />
                            {uploading === docType.type ? 'Subiendo...' : 'Subir archivo'}
                          </Button>
                          <p className="text-xs text-muted-foreground mt-2">
                            PDF, JPG, PNG (máx. 10MB)
                          </p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            } else {
              // Wizard mode rendering - existing layout
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
                      
                      {uploadedDoc || tempDoc ? (
                        <div className="flex items-center gap-2 text-sm">
                          <FileCheck className="h-4 w-4 text-green-500" />
                          <span>{uploadedDoc?.fileName || tempDoc?.fileName}</span>
                          {(uploadedDoc?.fileSize || tempDoc?.fileSize) && (
                            <span className="text-muted-foreground">
                              ({formatFileSize(uploadedDoc?.fileSize || tempDoc?.fileSize)})
                            </span>
                          )}
                          {!loadId && (
                            <Badge variant="secondary" className="text-xs">Pendiente</Badge>
                          )}
                        </div>
                       ) : (
                         <div className="flex items-center gap-2">
                           {/* For generated documents like Load Order */}
                           {docType.isGenerated ? (
                             <Button 
                               variant="outline" 
                               size="sm"
                               onClick={() => {
                                 if (docType.type === 'load_order') {
                                   setShowGenerateLoadOrder(true);
                                 }
                               }}
                               disabled={uploading === docType.type}
                             >
                               <Plus className="h-4 w-4 mr-2" />
                               Generar {docType.label}
                             </Button>
                           ) : (
                             <>
                               <input
                                 type="file"
                                 id={`file-upload-${docType.type}`}
                                 className="hidden"
                                 accept=".pdf,.jpg,.jpeg,.png"
                                 onChange={(e) => handleFileUpload(docType.type, e.target.files)}
                                 disabled={uploading === docType.type}
                               />
                               <Button 
                                 variant="outline" 
                                 size="sm"
                                 disabled={uploading === docType.type}
                                 onClick={() => {
                                   const fileInput = document.getElementById(`file-upload-${docType.type}`) as HTMLInputElement;
                                   fileInput?.click();
                                 }}
                               >
                                 <Upload className="h-4 w-4 mr-2" />
                                 {uploading === docType.type ? 'Subiendo...' : 'Subir archivo'}
                               </Button>
                             </>
                           )}
                           <span className="text-xs text-muted-foreground">
                             {docType.isGenerated 
                               ? 'Documento generado automáticamente'
                               : loadId ? 'PDF, JPG, PNG (máx. 10MB)' : 'Se subirá al guardar la carga'
                             }
                           </span>
                         </div>
                      )}
                    </div>
                    
                    {(uploadedDoc || tempDoc) && !isDialogMode && (
                      <div className="flex items-center gap-1">
                        {uploadedDoc && (
                           <>
                             <Button 
                               variant="ghost" 
                               size="sm"
                               onClick={() => {
                                 if (!uploadedDoc.url) {
                                   toast({
                                     title: "Error",
                                     description: "No se pudo encontrar la URL del documento",
                                     variant: "destructive",
                                   });
                                   return;
                                 }
                                 window.open(uploadedDoc.url, '_blank');
                               }}
                               title="Ver documento"
                             >
                               <Eye className="h-4 w-4" />
                             </Button>
                             <Button 
                               variant="ghost" 
                               size="sm"
                               onClick={async () => {
                                 if (!uploadedDoc.url) {
                                   toast({
                                     title: "Error",
                                     description: "No se pudo encontrar la URL del documento para descargar",
                                     variant: "destructive",
                                   });
                                   return;
                                 }
                                 
                                 try {
                                   const response = await fetch(uploadedDoc.url);
                                   if (!response.ok) {
                                     throw new Error(`HTTP error! status: ${response.status}`);
                                   }
                                   
                                   const blob = await response.blob();
                                   const blobUrl = window.URL.createObjectURL(blob);
                                   const link = document.createElement('a');
                                   link.href = blobUrl;
                                   link.download = uploadedDoc.fileName;
                                   link.style.display = 'none';
                                   
                                   document.body.appendChild(link);
                                   link.click();
                                   document.body.removeChild(link);
                                   
                                   window.URL.revokeObjectURL(blobUrl);
                                   
                                   toast({
                                     title: "Descarga iniciada",
                                     description: `${uploadedDoc.fileName} se está descargando`,
                                   });
                                 } catch (error) {
                                   const link = document.createElement('a');
                                   link.href = uploadedDoc.url;
                                   link.download = uploadedDoc.fileName;
                                   link.target = '_blank';
                                   link.rel = 'noopener noreferrer';
                                   
                                   document.body.appendChild(link);
                                   link.click();
                                   document.body.removeChild(link);
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
                          onClick={async () => {
                            if (uploadedDoc) {
                              await handleRemoveDocument(uploadedDoc.id);
                            }
                            if (tempDoc) {
                              handleRemoveTemporaryDocument(tempDoc.id);
                            }
                            if (docType.type === 'load_order') {
                              setHasLoadOrder(false);
                            }
                          }}
                          title="Eliminar documento"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              );
            }
          })}
        </div>
      </div>
    </div>
  );

  // Conditional rendering based on dialog mode
  if (isDialogMode) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Gestión de Documentos - Carga {loadNumber}
            </DialogTitle>
          </DialogHeader>

          {uploading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            renderDocumentManagement()
          )}
        </DialogContent>
      </Dialog>
    );
  }

  // Wizard mode rendering
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
        {renderDocumentManagement()}
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
          client_name: '',
          driver_name: '',
          loadStops: []
        }}
        onLoadOrderGenerated={handleLoadOrderGenerated}
      />
    </Card>
  );
}
